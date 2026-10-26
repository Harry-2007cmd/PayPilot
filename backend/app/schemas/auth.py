from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class TokenRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    merchant_id: uuid.UUID
    created_at: datetime
    disabled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MerchantOut(BaseModel):
    id: uuid.UUID
    name: str
    default_currency: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    user: UserOut
    merchant: MerchantOut