from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from decimal import Decimal
import uuid
import json

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import get_current_merchant
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent
from app.schemas.event import WebhookStatusResponse
from app.services.paypal_adapter import PayPalAdapter

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


async def verify_paypal_webhook_signature(
    request: Request,
    transmission_id: str = Header(..., alias="paypal-transmission-id"),
    transmission_time: str = Header(..., alias="paypal-transmission-time"),
    cert_url: str = Header(..., alias="paypal-cert-url"),
    auth_algo: str = Header(..., alias="paypal-auth-algo"),
    transmission_sig: str = Header(..., alias="paypal-transmission-sig"),
    webhook_id: str = Header(None, alias="paypal-webhook-id"),
) -> dict:
    """Verify PayPal webhook signature using the supported verification mechanism."""
    body = await request.body()

    adapter = PayPalAdapter()
    verified = await adapter.verify_webhook_signature(
        transmission_id=transmission_id,
        transmission_time=transmission_time,
        cert_url=cert_url,
        auth_algo=auth_algo,
        transmission_sig=transmission_sig,
        webhook_id=webhook_id or settings.PAYPAL_WEBHOOK_ID,
        webhook_body=body.decode(),
    )

    if not verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    return await request.json()


@router.post("/paypal")
async def receive_paypal_webhook(
    payload: dict = Depends(verify_paypal_webhook_signature),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Receive and process PayPal webhook events with idempotent processing."""
    event_id = payload.get("id")
    event_type = payload.get("event_type")
    resource = payload.get("resource", {})

    # Check for duplicate
    existing = await db.execute(
        select(ProviderEvent).where(
            ProviderEvent.provider == "paypal",
            ProviderEvent.provider_event_id == event_id
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate", "event_id": event_id}

    # Create event record
    event = ProviderEvent(
        merchant_id=current_merchant.id,
        provider="paypal",
        provider_event_id=event_id,
        event_type=event_type,
        event_time=payload.get("create_time"),
        received_at=datetime.now(timezone.utc),
        verification_status="verified",
        processing_status="processing",
        payload_minimized_json={
            "event_type": event_type,
            "resource_type": resource.get("resource_type"),
            "resource_id": resource.get("id"),
            "status": resource.get("status"),
            "amount": resource.get("amount"),
            "currency": resource.get("currency_code"),
            "order_id": resource.get("order_id") or resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id"),
        },
    )
    db.add(event)

    # Process event idempotently
    await process_webhook_event(event, payload, db)

    event.processing_status = "processed"
    await db.commit()

    return {"status": "processed", "event_id": event_id}


async def process_webhook_event(event: ProviderEvent, payload: dict, db: AsyncSession):
    """Process webhook event and update local state."""
    resource = payload.get("resource", {})
    resource_type = resource.get("resource_type")
    resource_status = resource.get("status")

    if resource_type == "CHECKOUT.ORDER" and resource_status == "COMPLETED":
        # Order approved by buyer - wait for capture
        pass
    elif resource_type == "CAPTURE" and resource_status == "COMPLETED":
        # Payment captured
        capture_id = resource.get("id")
        amount = Decimal(resource.get("amount", {}).get("value", "0"))
        currency = resource.get("amount", {}).get("currency_code", "USD")
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")

        if order_id:
            result = await db.execute(
                select(Order).where(
                    Order.merchant_id == event.merchant_id,
                    Order.metadata_json["paypal_order_id"].astext == order_id
                )
            )
            order = result.scalar_one_or_none()

            if order:
                # Check if payment already exists
                existing_payment = await db.execute(
                    select(PaymentAttempt).where(
                        PaymentAttempt.merchant_id == event.merchant_id,
                        PaymentAttempt.capture_id == capture_id
                    )
                )
                if not existing_payment.scalar_one_or_none():
                    payment = PaymentAttempt(
                        merchant_id=event.merchant_id,
                        order_id=order.id,
                        provider="paypal",
                        provider_order_id=order_id,
                        capture_id=capture_id,
                        currency=currency,
                        amount=amount,
                        status="captured",
                        provider_status="COMPLETED",
                        provenance="paypal_webhook_verified",
                        last_verified_at=datetime.now(timezone.utc),
                    )
                    db.add(payment)
                    order.status = "paid"
                    order.updated_at = datetime.now(timezone.utc)

    elif resource_type == "CAPTURE" and resource_status in ["REFUNDED", "PARTIALLY_REFUNDED"]:
        # Refund processed
        capture_id = resource.get("id")
        result = await db.execute(
            select(PaymentAttempt).where(
                PaymentAttempt.merchant_id == event.merchant_id,
                PaymentAttempt.capture_id == capture_id
            )
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "refunded" if resource_status == "REFUNDED" else "partially_refunded"
            payment.provider_status = resource_status
            payment.last_verified_at = datetime.now(timezone.utc)

    elif resource_type == "AUTHORIZATION" and resource_status in ["VOIDED", "EXPIRED"]:
        # Authorization voided or expired
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        if order_id:
            result = await db.execute(
                select(Order).where(
                    Order.merchant_id == event.merchant_id,
                    Order.metadata_json["paypal_order_id"].astext == order_id
                )
            )
            order = result.scalar_one_or_none()
            if order:
                order.status = "cancelled"
                order.updated_at = datetime.now(timezone.utc)


@router.get("/status", response_model=WebhookStatusResponse)
async def webhook_status(
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Get webhook processing status (admin/diagnostic)."""
    from sqlalchemy import func
    result = await db.execute(
        select(
            func.count(ProviderEvent.id),
            func.sum((ProviderEvent.verification_status == "verified").cast(int)),
            func.sum((ProviderEvent.verification_status == "pending").cast(int)),
            func.sum((ProviderEvent.verification_status == "failed").cast(int)),
            func.sum((ProviderEvent.processing_status == "duplicate").cast(int)),
        ).where(ProviderEvent.merchant_id == current_merchant.id)
    )
    total, verified, pending, failed, duplicate = result.one()
    return WebhookStatusResponse(
        total_events=total or 0,
        verified=verified or 0,
        pending=pending or 0,
        failed=failed or 0,
        duplicate=duplicate or 0,
    )