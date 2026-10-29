from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent
from app.models.audit import AuditEvent
from app.services.paypal_adapter import PayPalAdapter
from app.schemas.payment import PaymentAttemptOut, PaymentAttemptListResponse, PaymentTimelineResponse, PaymentTimelineEvent

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("", response_model=PaymentAttemptListResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(PaymentAttempt).where(PaymentAttempt.merchant_id == current_merchant.id)
    if status_filter:
        query = query.where(PaymentAttempt.status == status_filter)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(PaymentAttempt.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    payments = result.scalars().all()
    return PaymentAttemptListResponse(items=payments, total=total, page=page, page_size=page_size)


@router.get("/{payment_id}", response_model=PaymentAttemptOut)
async def get_payment(
    payment_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == payment_id, PaymentAttempt.merchant_id == current_merchant.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment


@router.get("/{payment_id}/timeline", response_model=PaymentTimelineResponse)
async def get_payment_timeline(
    payment_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == payment_id, PaymentAttempt.merchant_id == current_merchant.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    # Get related events
    events_result = await db.execute(
        select(ProviderEvent)
        .where(
            ProviderEvent.merchant_id == current_merchant.id,
            ProviderEvent.payload_minimized_json["resource_id"].astext == payment.capture_id
        )
        .order_by(ProviderEvent.event_time.asc())
    )
    events = events_result.scalars().all()

    timeline = []
    # Add payment creation
    timeline.append(PaymentTimelineEvent(
        event_time=payment.created_at,
        event_type="payment_created",
        source="local",
        status=payment.status,
        details={"payment_id": str(payment.id), "amount": str(payment.amount), "currency": payment.currency},
        provenance=payment.provenance,
    ))

    # Add provider events
    for event in events:
        timeline.append(PaymentTimelineEvent(
            event_time=event.event_time,
            event_type=event.event_type,
            source="provider_event",
            status=event.payload_minimized_json.get("status", "unknown"),
            details=event.payload_minimized_json,
            provenance="provider_event",
        ))

    return PaymentTimelineResponse(payment_attempt=payment, timeline=timeline)


@router.post("/{payment_id}/refresh", response_model=PaymentAttemptOut)
async def refresh_payment_status(
    payment_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Refresh payment status directly from PayPal API on demand."""
    result = await db.execute(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == payment_id, PaymentAttempt.merchant_id == current_merchant.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if not payment.capture_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No capture ID to refresh")

    adapter = PayPalAdapter()
    try:
        capture_data = await adapter.get_capture(payment.capture_id)
    except Exception as e:
        # Record failure in audit but do not change local state
        audit = AuditEvent(
            id=uuid.uuid4(),
            merchant_id=current_merchant.id,
            actor_user_id=current_user.id,
            action="payment_refresh_failed",
            target_type="payment_attempt",
            target_id=str(payment.id),
            timestamp=datetime.now(timezone.utc),
            outcome="error",
            details_redacted_json={"error": str(e)[:500]},
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach PayPal to verify payment status"
        )

    old_status = payment.status
    provider_status = capture_data.get("status", "")
    payment.provider_status = provider_status
    payment.last_verified_at = datetime.now(timezone.utc)
    payment.provenance = "paypal_api_refresh"

    # Valid state transitions based on provider response
    if provider_status == "REFUNDED" and payment.status == "captured":
        payment.status = "refunded"
    elif provider_status == "PARTIALLY_REFUNDED" and payment.status == "captured":
        payment.status = "partially_refunded"

    audit = AuditEvent(
        id=uuid.uuid4(),
        merchant_id=current_merchant.id,
        actor_user_id=current_user.id,
        action="payment_refreshed",
        target_type="payment_attempt",
        target_id=str(payment.id),
        timestamp=datetime.now(timezone.utc),
        outcome="success",
        details_redacted_json={
            "old_status": old_status,
            "new_status": payment.status,
            "provider_status": provider_status,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(payment)
    return payment