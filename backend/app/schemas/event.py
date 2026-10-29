from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class ProviderEventOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    provider: str
    provider_event_id: str
    event_type: str
    event_time: datetime
    received_at: datetime
    verification_status: str
    processing_status: str
    payload_minimized_json: dict

    model_config = ConfigDict(from_attributes=True)


class ProviderEventListResponse(BaseModel):
    items: list[ProviderEventOut]
    total: int
    page: int
    page_size: int