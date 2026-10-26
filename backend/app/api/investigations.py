from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.investigation import Investigation, InvestigationFinding
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.schemas.investigation import (
    InvestigationCreate, InvestigationUpdate, InvestigationOut,
    InvestigationListResponse, AIInvestigateRequest, AIInvestigateResponse
)
from app.services.rules_engine import RulesEngine
from app.services.ai_agent import AIAgent

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.post("", response_model=InvestigationOut, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    inv_data: InvestigationCreate,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    investigation = Investigation(
        merchant_id=current_merchant.id,
        created_by=current_user.id,
        issue_type=inv_data.issue_type,
        status="open",
        title=inv_data.title,
        order_id=inv_data.order_id,
        payment_attempt_id=inv_data.payment_attempt_id,
        priority=inv_data.priority,
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.get("", response_model=InvestigationListResponse)
async def list_investigations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    issue_type: str | None = Query(None, alias="issue_type"),
    priority: str | None = Query(None),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(Investigation).where(Investigation.merchant_id == current_merchant.id)
    if status_filter:
        query = query.where(Investigation.status == status_filter)
    if issue_type:
        query = query.where(Investigation.issue_type == issue_type)
    if priority:
        query = query.where(Investigation.priority == priority)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(Investigation.opened_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query.options(selectinload(Investigation.findings)))
    investigations = result.scalars().all()
    return InvestigationListResponse(items=investigations, total=total, page=page, page_size=page_size)


@router.get("/{investigation_id}", response_model=InvestigationOut)
async def get_investigation(
    investigation_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Investigation)
        .options(selectinload(Investigation.findings))
        .where(Investigation.id == investigation_id, Investigation.merchant_id == current_merchant.id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    return investigation


@router.patch("/{investigation_id}", response_model=InvestigationOut)
async def update_investigation(
    investigation_id: uuid.UUID,
    update_data: InvestigationUpdate,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == investigation_id, Investigation.merchant_id == current_merchant.id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    if update_data.status is not None:
        investigation.status = update_data.status
        if update_data.status == "resolved":
            investigation.resolved_at = datetime.now(timezone.utc)
    if update_data.priority is not None:
        investigation.priority = update_data.priority
    if update_data.title is not None:
        investigation.title = update_data.title
    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.post("/{investigation_id}/run", response_model=AIInvestigateResponse)
async def run_investigation(
    investigation_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Investigation)
        .options(selectinload(Investigation.order), selectinload(Investigation.payment_attempt))
        .where(Investigation.id == investigation_id, Investigation.merchant_id == current_merchant.id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")

    # Run deterministic rules
    rules_engine = RulesEngine(db)
    if investigation.order_id:
        rule_results = await rules_engine.check_order_payment(investigation.order_id, investigation.payment_attempt_id)
    else:
        rule_results = {"findings": []}

    # Run AI agent
    ai_agent = AIAgent(db)
    ai_result = await ai_agent.investigate(
        investigation_id=investigation_id,
        merchant_id=current_merchant.id,
        order_id=investigation.order_id,
        payment_attempt_id=investigation.payment_attempt_id,
    )

    return AIInvestigateResponse(**ai_result)


@router.post("/ai/investigate", response_model=AIInvestigateResponse)
async def ai_investigate(
    request: AIInvestigateRequest,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Direct AI investigation endpoint without creating an investigation record first."""
    ai_agent = AIAgent(db)
    ai_result = await ai_agent.investigate(
        investigation_id=request.investigation_id,
        merchant_id=current_merchant.id,
        order_id=request.order_id,
        payment_attempt_id=request.payment_attempt_id,
        question=request.question,
    )
    return AIInvestigateResponse(**ai_result)