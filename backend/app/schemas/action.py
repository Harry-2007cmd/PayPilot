from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime
import uuid


class ProposedActionCreate(BaseModel):
    investigation_id: Optional[uuid.UUID] = None
    action_type: str = Field(..., pattern="^(refund)$")
    target_capture_id: str
    currency: str = Field(..., min_length=3, max_length=3)
    amount: Decimal = Field(..., gt=0, max_digits=19, decimal_places=4)
    reason: str
    idempotency_key: str


class ProposedActionApprove(BaseModel):
    approved: bool = True


class ProposedActionOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    investigation_id: uuid.UUID
    action_type: str
    target_capture_id: str
    currency: str
    amount: Decimal
    reason: str
    status: str
    proposed_by: uuid.UUID
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    provider_request_id: Optional[str] = None
    idempotency_key: str
    outcome_json: dict

    class Config:
        from_attributes = True


class ProposedActionListResponse(BaseModel):
    items: list[ProposedActionOut]
    total: int
    page: int
    page_size: int


class AuditEventOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    actor_user_id: Optional[uuid.UUID] = None
    action: str
    target_type: str
    target_id: str
    timestamp: datetime
    outcome: str
    correlation_id: Optional[str] = None
    details_redacted_json: dict

    class Config:
        from_attributes = True


class AuditEventListResponse(BaseModel):
    items: list[AuditEventOut]
    total: int
    page: int
    page_size: int