from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime
import uuid


class PaymentAttemptCreate(BaseModel):
    order_id: uuid.UUID
    provider: str
    provider_order_id: str
    capture_id: Optional[str] = None
    currency: str = Field(..., min_length=3, max_length=3)
    amount: Decimal = Field(..., gt=0, max_digits=19, decimal_places=4)
    status: str
    provider_status: Optional[str] = None
    provenance: str = Field(..., pattern="^(paypal_api|paypal_api_refresh|merchant_csv_import|test_fixture)$")


class PaymentAttemptUpdate(BaseModel):
    status: Optional[str] = None
    provider_status: Optional[str] = None
    capture_id: Optional[str] = None
    last_verified_at: Optional[datetime] = None


class PaymentAttemptOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    order_id: uuid.UUID
    provider: str
    provider_order_id: str
    capture_id: Optional[str] = None
    currency: str
    amount: Decimal
    status: str
    provider_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    provenance: str
    last_verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentAttemptListResponse(BaseModel):
    items: list[PaymentAttemptOut]
    total: int
    page: int
    page_size: int


class PaymentTimelineEvent(BaseModel):
    event_time: datetime
    event_type: str
    source: str
    status: str
    details: dict
    provenance: str


class PaymentTimelineResponse(BaseModel):
    payment_attempt: PaymentAttemptOut
    timeline: list[PaymentTimelineEvent]