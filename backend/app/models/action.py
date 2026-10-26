import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ProposedAction(Base):
    __tablename__ = "proposed_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False
    )
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_capture_id: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    proposed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_request_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    outcome_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    merchant: Mapped["Merchant"] = relationship(back_populates="proposed_actions")
    investigation: Mapped["Investigation"] = relationship(back_populates="proposed_actions")
    proposed_by_user: Mapped["User"] = relationship(foreign_keys=[proposed_by])
    approved_by_user: Mapped[Optional["User"]] = relationship(foreign_keys=[approved_by])

    __table_args__ = (
        Index("ix_proposed_actions_merchant_status", "merchant_id", "status"),
        Index("ix_proposed_actions_investigation", "investigation_id"),
    )