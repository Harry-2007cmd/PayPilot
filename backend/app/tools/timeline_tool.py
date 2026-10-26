import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent


async def get_event_timeline(
    db: AsyncSession,
    merchant_id: str,
    order_id: Optional[str] = None,
    payment_attempt_id: Optional[str] = None
) -> list[dict]:
    """Get chronological event timeline with merchant scope enforcement."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
    except (ValueError, TypeError):
        return {"error": "Invalid merchant_id"}

    events = []

    if payment_attempt_id:
        try:
            payment_uuid = uuid.UUID(payment_attempt_id)
            payment_result = await db.execute(
                select(PaymentAttempt).where(
                    PaymentAttempt.id == payment_uuid,
                    PaymentAttempt.merchant_id == merchant_uuid
                )
            )
            payment = payment_result.scalar_one_or_none()
            if payment:
                events.append({
                    "event_time": payment.created_at.isoformat(),
                    "event_type": "payment_created",
                    "source": "local",
                    "status": payment.status,
                    "details": {"payment_id": str(payment.id), "amount": str(payment.amount), "currency": payment.currency},
                    "provenance": payment.provenance,
                })

                if payment.capture_id:
                    event_result = await db.execute(
                        select(ProviderEvent).where(
                            ProviderEvent.merchant_id == merchant_uuid,
                            ProviderEvent.payload_minimized_json["resource_id"].astext == payment.capture_id,
                        )
                    )
                    for event in event_result.scalars().all():
                        events.append({
                            "event_time": event.event_time.isoformat(),
                            "event_type": event.event_type,
                            "source": "paypal_webhook_verified",
                            "status": event.payload_minimized_json.get("status", "unknown"),
                            "details": event.payload_minimized_json,
                            "provenance": "paypal_webhook_verified",
                        })
        except ValueError:
            pass

    return sorted(events, key=lambda e: e["event_time"])