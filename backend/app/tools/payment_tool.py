import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.payment import PaymentAttempt


async def get_payment_details(db: AsyncSession, payment_attempt_id: str, merchant_id: str) -> dict:
    """Get payment attempt details by UUID with merchant scope enforcement."""
    try:
        payment_uuid = uuid.UUID(payment_attempt_id)
        merchant_uuid = uuid.UUID(merchant_id)
    except (ValueError, TypeError):
        return {"error": "Invalid payment_attempt_id or merchant_id"}

    result = await db.execute(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == payment_uuid, PaymentAttempt.merchant_id == merchant_uuid)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return {"error": "Payment not found"}

    return {
        "id": str(payment.id),
        "order_id": str(payment.order_id),
        "provider": payment.provider,
        "provider_order_id": payment.provider_order_id,
        "capture_id": payment.capture_id,
        "currency": payment.currency,
        "amount": str(payment.amount),
        "status": payment.status,
        "provider_status": payment.provider_status,
        "provenance": payment.provenance,
        "created_at": payment.created_at.isoformat(),
        "last_verified_at": payment.last_verified_at.isoformat() if payment.last_verified_at else None,
    }