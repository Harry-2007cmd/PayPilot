from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, String
from sqlalchemy.orm import selectinload
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.schemas.order import OrderCreate, OrderUpdate, OrderOut, OrderListResponse
from app.schemas.payment import PaymentAttemptOut, PaymentTimelineResponse, PaymentTimelineEvent
from app.services.paypal_adapter import PayPalAdapter

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    order = Order(
        merchant_id=current_merchant.id,
        source_type=order_data.source_type,
        external_order_id=order_data.external_order_id,
        currency=order_data.currency.upper(),
        total_amount=order_data.total_amount,
        status=order_data.status,
        provenance=order_data.provenance,
        metadata_json=order_data.metadata_json,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(Order).where(Order.merchant_id == current_merchant.id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    if search:
        query = query.where(
            or_(
                Order.external_order_id.ilike(f"%{search}%"),
                Order.id.cast(String).ilike(f"%{search}%")
            )
        )
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    orders = result.scalars().all()
    return OrderListResponse(items=orders, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.payment_attempts))
        .where(Order.id == order_id, Order.merchant_id == current_merchant.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/{order_id}", response_model=OrderOut)
async def update_order(
    order_id: uuid.UUID,
    update_data: OrderUpdate,
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
    if update_data.status is not None:
        order.status = update_data.status
    if update_data.total_amount is not None:
        order.total_amount = update_data.total_amount
    if update_data.metadata_json is not None:
        order.metadata_json = update_data.metadata_json
    await db.commit()
    await db.refresh(order)
    return order