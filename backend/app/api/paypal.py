from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from decimal import Decimal
import uuid

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent
from app.schemas.order import OrderOut
from app.schemas.payment import PaymentAttemptOut
from app.services.paypal_adapter import PayPalAdapter

router = APIRouter(prefix="/api/paypal", tags=["paypal"])


@router.post("/orders/{order_id}/create", response_model=dict)
async def create_paypal_order(
    order_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.merchant_id == current_merchant.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    adapter = PayPalAdapter()
    try:
        paypal_order = await adapter.create_order(
            amount=str(order.total_amount),
            currency=order.currency,
            reference_id=str(order.id),
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"PayPal error: {str(e)}")

    # Store PayPal order ID in metadata
    order.metadata_json = {**order.metadata_json, "paypal_order_id": paypal_order["id"]}
    await db.commit()

    return {
        "paypal_order_id": paypal_order["id"],
        "approval_url": next(
            (link["href"] for link in paypal_order.get("links", []) if link["rel"] == "approve"),
            None
        ),
        "status": paypal_order.get("status"),
    }


@router.post("/orders/{order_id}/capture", response_model=PaymentAttemptOut)
async def capture_paypal_order(
    order_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.merchant_id == current_merchant.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    paypal_order_id = order.metadata_json.get("paypal_order_id")
    if not paypal_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No PayPal order ID found")

    adapter = PayPalAdapter()
    try:
        capture = await adapter.capture_order(paypal_order_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"PayPal error: {str(e)}")

    # Create payment attempt record
    capture_data = capture.get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])[0]
    capture_id = capture_data.get("id")
    amount = Decimal(capture_data.get("amount", {}).get("value", "0"))
    currency = capture_data.get("amount", {}).get("currency_code", order.currency)

    payment = PaymentAttempt(
        merchant_id=current_merchant.id,
        order_id=order.id,
        provider="paypal",
        provider_order_id=paypal_order_id,
        capture_id=capture_id,
        currency=currency,
        amount=amount,
        status="captured",
        provider_status=capture.get("status"),
        provenance="paypal_api",
    )
    db.add(payment)

    # Update order status
    order.status = "paid"
    order.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(payment)
    return payment