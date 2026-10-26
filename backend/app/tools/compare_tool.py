import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.services.rules_engine import RulesEngine


async def compare_order_payment(
    db: AsyncSession,
    merchant_id: str,
    order_id: str,
    payment_attempt_id: Optional[str] = None
) -> dict:
    """Compare an order with its payment attempt and return deterministic mismatch findings."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
        order_uuid = uuid.UUID(order_id)
    except (ValueError, TypeError):
        return {"error": "Invalid merchant_id or order_id"}

    # Verify order belongs to merchant
    order_result = await db.execute(
        select(Order).where(Order.id == order_uuid, Order.merchant_id == merchant_uuid)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        return {"error": "Order not found"}

    rules_engine = RulesEngine(db)
    return await rules_engine.check_order_payment(order_uuid, uuid.UUID(payment_attempt_id) if payment_attempt_id else None)