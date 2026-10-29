from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime
import uuid


class OrderCreate(BaseModel):
    source_type: str = Field(..., pattern="^(local|paypal|imported)$")
    external_order_id: str
    currency: str = Field(..., min_length=3, max_length=3)
    total_amount: Decimal = Field(..., gt=0, max_digits=19, decimal_places=4)
    status: str = Field(default="created")
    provenance: str = Field(..., pattern="^(local|paypal_api|paypal_api_refresh|merchant_csv_import|test_fixture)$")
    metadata_json: dict = Field(default_factory=dict)


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    total_amount: Optional[Decimal] = None
    metadata_json: Optional[dict] = None


class OrderOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    source_type: str
    external_order_id: str
    currency: str
    total_amount: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    provenance: str
    metadata_json: dict

    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    items: list[OrderOut]
    total: int
    page: int
    page_size: int