from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.action import ProposedAction
from app.models.investigation import Investigation
from app.models.payment import PaymentAttempt
from app.models.audit import AuditEvent
from app.schemas.action import (
    ProposedActionCreate, ProposedActionApprove, ProposedActionOut,
    ProposedActionListResponse, AuditEventListResponse, AuditEventOut
)
from app.services.paypal_adapter import PayPalAdapter
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api", tags=["actions"])


@router.post("/investigations/{investigation_id}/proposed-actions", response_model=ProposedActionOut, status_code=status.HTTP_201_CREATED)
async def create_proposed_action(
    investigation_id: uuid.UUID,
    action_data: ProposedActionCreate,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    # Verify investigation belongs to merchant
    result = await db.execute(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.merchant_id == current_merchant.id
        )
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    # Verify payment exists and is eligible
    payment_result = await db.execute(
        select(PaymentAttempt).where(
            PaymentAttempt.merchant_id == current_merchant.id,
            PaymentAttempt.capture_id == action_data.target_capture_id,
            PaymentAttempt.status == "captured"
        )
    )
    payment = payment_result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found or not eligible for refund")

    # Check for existing pending action with same idempotency key
    existing = await db.execute(
        select(ProposedAction).where(ProposedAction.idempotency_key == action_data.idempotency_key)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Action with this idempotency key already exists")

    proposed_action = ProposedAction(
        merchant_id=current_merchant.id,
        investigation_id=investigation_id,
        action_type=action_data.action_type,
        target_capture_id=action_data.target_capture_id,
        currency=action_data.currency.upper(),
        amount=action_data.amount,
        reason=action_data.reason,
        status="pending",
        proposed_by=current_user.id,
        idempotency_key=action_data.idempotency_key,
    )
    db.add(proposed_action)
    await db.commit()
    await db.refresh(proposed_action)

    # Audit log
    audit = AuditService(db)
    await audit.log(
        merchant_id=current_merchant.id,
        actor_user_id=current_user.id,
        action="proposed_action_created",
        target_type="proposed_action",
        target_id=str(proposed_action.id),
        outcome="success",
        details={"action_type": action_data.action_type, "amount": str(action_data.amount), "currency": action_data.currency},
    )

    return proposed_action


@router.post("/proposed-actions/{action_id}/approve", response_model=ProposedActionOut)
async def approve_proposed_action(
    action_id: uuid.UUID,
    approval: ProposedActionApprove,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProposedAction)
        .where(ProposedAction.id == action_id, ProposedAction.merchant_id == current_merchant.id)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposed action not found")

    if action.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Action cannot be approved, current status: {action.status}")

    if not approval.approved:
        action.status = "rejected"
        action.approved_by = current_user.id
        action.approved_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(action)
        return action

    # Revalidate payment before executing
    payment_result = await db.execute(
        select(PaymentAttempt).where(
            PaymentAttempt.merchant_id == current_merchant.id,
            PaymentAttempt.capture_id == action.target_capture_id,
            PaymentAttempt.status == "captured"
        )
    )
    payment = payment_result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment no longer eligible for refund")

    # Execute refund
    action.status = "executing"
    action.approved_by = current_user.id
    action.approved_at = datetime.now(timezone.utc)
    await db.commit()

    adapter = PayPalAdapter()
    try:
        refund_result = await adapter.refund_capture(
            capture_id=action.target_capture_id,
            amount=str(action.amount),
            currency=action.currency,
            idempotency_key=action.idempotency_key,
        )
        action.status = "executed"
        action.executed_at = datetime.now(timezone.utc)
        action.provider_request_id = refund_result.get("id")
        action.outcome_json = refund_result
    except Exception as e:
        action.status = "failed"
        action.outcome_json = {"error": str(e)}
        await db.commit()
        await db.refresh(action)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Refund failed: {str(e)}")

    # Update payment status
    payment.status = "refunded"
    payment.provider_status = "REFUNDED"
    payment.last_verified_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(action)

    # Audit log
    audit = AuditService(db)
    await audit.log(
        merchant_id=current_merchant.id,
        actor_user_id=current_user.id,
        action="proposed_action_approved",
        target_type="proposed_action",
        target_id=str(action.id),
        outcome="success",
        correlation_id=action.idempotency_key,
        details={"provider_request_id": action.provider_request_id, "amount": str(action.amount)},
    )

    return action


@router.post("/proposed-actions/{action_id}/reject", response_model=ProposedActionOut)
async def reject_proposed_action(
    action_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProposedAction)
        .where(ProposedAction.id == action_id, ProposedAction.merchant_id == current_merchant.id)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposed action not found")

    if action.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Action cannot be rejected, current status: {action.status}")

    action.status = "rejected"
    action.approved_by = current_user.id
    action.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(action)

    # Audit log
    audit = AuditService(db)
    await audit.log(
        merchant_id=current_merchant.id,
        actor_user_id=current_user.id,
        action="proposed_action_rejected",
        target_type="proposed_action",
        target_id=str(action.id),
        outcome="success",
    )

    return action


@router.get("/proposed-actions", response_model=ProposedActionListResponse)
async def list_proposed_actions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProposedAction).where(ProposedAction.merchant_id == current_merchant.id)
    if status_filter:
        query = query.where(ProposedAction.status == status_filter)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(ProposedAction.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    actions = result.scalars().all()
    return ProposedActionListResponse(items=actions, total=total, page=page, page_size=page_size)


@router.get("/audit-events", response_model=AuditEventListResponse)
async def list_audit_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_filter: str | None = Query(None, alias="action"),
    target_type: str | None = Query(None, alias="target_type"),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditEvent).where(AuditEvent.merchant_id == current_merchant.id)
    if action_filter:
        query = query.where(AuditEvent.action == action_filter)
    if target_type:
        query = query.where(AuditEvent.target_type == target_type)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(AuditEvent.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = result.scalars().all()
    return AuditEventListResponse(items=events, total=total, page=page, page_size=page_size)