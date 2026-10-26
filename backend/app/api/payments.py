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
            source="paypal_webhook_verified",
            status=event.payload_minimized_json.get("status", "unknown"),
            details=event.payload_minimized_json,
            provenance="paypal_webhook_verified",
        ))

    return PaymentTimelineResponse(payment_attempt=payment, timeline=timeline)