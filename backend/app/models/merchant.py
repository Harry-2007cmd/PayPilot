import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    users: Mapped[list["User"]] = relationship(back_populates="merchant")
    orders: Mapped[list["Order"]] = relationship(back_populates="merchant")
    payment_attempts: Mapped[list["PaymentAttempt"]] = relationship(back_populates="merchant")
    provider_events: Mapped[list["ProviderEvent"]] = relationship(back_populates="merchant")
    investigations: Mapped[list["Investigation"]] = relationship(back_populates="merchant")
    proposed_actions: Mapped[list["ProposedAction"]] = relationship(back_populates="merchant")
    audit_events: Mapped[list["AuditEvent"]] = relationship(back_populates="merchant")
    imports: Mapped[list["ImportRecord"]] = relationship(back_populates="merchant")