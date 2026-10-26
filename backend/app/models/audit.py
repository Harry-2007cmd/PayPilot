import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False
    )
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details_redacted_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    merchant: Mapped["Merchant"] = relationship(back_populates="audit_events")

    __table_args__ = (
        Index("ix_audit_events_merchant_timestamp", "merchant_id", "timestamp"),
        Index("ix_audit_events_target", "target_type", "target_id"),
    )