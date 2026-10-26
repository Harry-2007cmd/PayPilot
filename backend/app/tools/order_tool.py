import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.order import Order


async def get_order_details(db: AsyncSession, order_id: str, merchant_id: str) -> dict:
    """Get order details by UUID with merchant scope enforcement."""
    try:
        order_uuid = uuid.UUID(order_id)
        merchant_uuid = uuid.UUID(merchant_id)
    except (ValueError, TypeError):
        return {"error": "Invalid order_id or merchant_id"}

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.payment_attempts))
        .where(Order.id == order_uuid, Order.merchant_id == merchant_uuid)
    )
    order = result.scalar_one_or_none()
    if not order:
        return {"error": "Order not found"}

    return {
        "id": str(order.id),
        "external_order_id": order.external_order_id,
        "source_type": order.source_type,
        "currency": order.currency,
        "total_amount": str(order.total_amount),
        "status": order.status,
        "provenance": order.provenance,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "payment_attempts": [
            {
                "id": str(p.id),
                "provider_order_id": p.provider_order_id,
                "capture_id": p.capture_id,
                "currency": p.currency,
                "amount": str(p.amount),
                "status": p.status,
                "provider_status": p.provider_status,
                "provenance": p.provenance,
            }
            for p in order.payment_attempts
        ],
    }