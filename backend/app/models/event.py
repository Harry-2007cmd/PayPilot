import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ProviderEvent(Base):
    __tablename__ = "provider_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    verification_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), default="unprocessed", nullable=False)
    payload_minimized_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    merchant: Mapped["Merchant"] = relationship(back_populates="provider_events")

    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_provider_event_id"),
        Index("ix_provider_events_merchant_received", "merchant_id", "received_at"),
    )