from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime
import uuid


class ImportPreviewRow(BaseModel):
    source_type: str
    external_order_id: Optional[str] = None
    external_payment_id: Optional[str] = None
    currency: str
    amount: Decimal
    status: str
    event_time: Optional[datetime] = None
    raw_data: dict
    row_number: int


class ImportPreviewResponse(BaseModel):
    import_id: uuid.UUID
    filename: str
    source_label: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: list[dict]
    preview: list[ImportPreviewRow]


class ImportConfirmRequest(BaseModel):
    import_id: uuid.UUID
    confirm: bool = True


class ImportRecordOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    uploaded_by: uuid.UUID
    filename: str
    source_label: str
    row_count: int
    valid_count: int
    error_count: int
    status: str
    uploaded_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ImportRecordListResponse(BaseModel):
    items: list[ImportRecordOut]
    total: int
    page: int
    page_size: int


class ImportedRecordOut(BaseModel):
    id: uuid.UUID
    import_id: uuid.UUID
    source_type: str
    external_order_id: Optional[str] = None
    external_payment_id: Optional[str] = None
    currency: str
    amount: Decimal
    status: str
    event_time: Optional[datetime] = None
    provenance: str
    source_row_number: int

    model_config = ConfigDict(from_attributes=True)