from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid
from decimal import Decimal


class InvestigationCreate(BaseModel):
    issue_type: str = Field(..., pattern="^(status_mismatch|amount_mismatch|currency_mismatch|duplicate_event|unmatched_import|failed_checkout|refund_inconsistency)$")
    title: str
    order_id: Optional[uuid.UUID] = None
    payment_attempt_id: Optional[uuid.UUID] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")


class InvestigationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    title: Optional[str] = None
    resolved_at: Optional[datetime] = None


class FindingOut(BaseModel):
    id: uuid.UUID
    investigation_id: uuid.UUID
    finding_type: str
    severity: str
    summary: str
    evidence_refs_json: dict
    facts_json: dict
    uncertainties_json: dict
    recommendation: str
    created_at: datetime
    model_version: Optional[str] = None

    class Config:
        from_attributes = True


class InvestigationOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    created_by: uuid.UUID
    issue_type: str
    status: str
    title: str
    order_id: Optional[uuid.UUID] = None
    payment_attempt_id: Optional[uuid.UUID] = None
    priority: str
    opened_at: datetime
    resolved_at: Optional[datetime] = None
    findings: list[FindingOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class InvestigationListResponse(BaseModel):
    items: list[InvestigationOut]
    total: int
    page: int
    page_size: int


class AIInvestigateRequest(BaseModel):
    question: str
    investigation_id: Optional[uuid.UUID] = None
    order_id: Optional[uuid.UUID] = None
    payment_attempt_id: Optional[uuid.UUID] = None


class AIInvestigateResponse(BaseModel):
    summary: str
    issue_type: str
    facts: list[dict]
    uncertainties: list[dict]
    recommendation: str
    proposed_action_id: Optional[uuid.UUID] = None
    confidence: Optional[str] = None
    needs_human_review: bool = True