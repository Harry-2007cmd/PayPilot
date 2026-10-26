import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal

from app.models.order import Order


async def find_related_records(
    db: AsyncSession,
    merchant_id: str,
    currency: Optional[str] = None,
    status: Optional[str] = None,
    min_amount: Optional[str] = None,
    max_amount: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 20
) -> dict:
    """Find related orders with strict bounds and merchant scope enforcement."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
    except (ValueError, TypeError):
        return {"error": "Invalid merchant_id", "orders": [], "count": 0}

    query = select(Order).where(Order.merchant_id == merchant_uuid)

    if currency:
        query = query.where(Order.currency == currency.upper())
    if status:
        query = query.where(Order.status == status)
    if min_amount:
        try:
            query = query.where(Order.total_amount >= Decimal(min_amount))
        except:
            pass
    if max_amount:
        try:
            query = query.where(Order.total_amount <= Decimal(max_amount))
        except:
            pass
    if source_type:
        query = query.where(Order.source_type == source_type)

    query = query.limit(min(limit, 50))
    result = await db.execute(query)
    orders = result.scalars().all()

    return {
        "orders": [
            {
                "id": str(o.id),
                "external_order_id": o.external_order_id,
                "currency": o.currency,
                "total_amount": str(o.total_amount),
                "status": o.status,
            }
            for o in orders
        ],
        "count": len(orders),
    }