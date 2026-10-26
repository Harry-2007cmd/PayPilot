import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True
    )
    payment_attempt_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_attempts.id"), nullable=True
    )
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    merchant: Mapped["Merchant"] = relationship(back_populates="investigations")
    created_by_user: Mapped["User"] = relationship(back_populates="investigations_created")
    order: Mapped[Optional["Order"]] = relationship(back_populates="investigations")
    payment_attempt: Mapped[Optional["PaymentAttempt"]] = relationship(back_populates="investigations")
    findings: Mapped[list["InvestigationFinding"]] = relationship(back_populates="investigation")
    proposed_actions: Mapped[list["ProposedAction"]] = relationship(back_populates="investigation")

    __table_args__ = (
        Index("ix_investigations_merchant_status", "merchant_id", "status"),
        Index("ix_investigations_order", "order_id"),
    )


class InvestigationFinding(Base):
    __tablename__ = "investigation_findings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    investigation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False
    )
    finding_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_refs_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    facts_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    uncertainties_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    investigation: Mapped["Investigation"] = relationship(back_populates="findings")

    __table_args__ = (
        Index("ix_investigation_findings_investigation", "investigation_id"),
    )