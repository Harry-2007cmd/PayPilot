import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ImportRecord(Base):
    __tablename__ = "imports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_label: Mapped[str] = mapped_column(String(50), nullable=False)
    row_count: Mapped[int] = mapped_column(default=0, nullable=False)
    valid_count: Mapped[int] = mapped_column(default=0, nullable=False)
    error_count: Mapped[int] = mapped_column(default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    merchant: Mapped["Merchant"] = relationship(back_populates="imports")
    imported_records: Mapped[list["ImportedRecord"]] = relationship(back_populates="import_record")


class ImportedRecord(Base):
    __tablename__ = "imported_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    import_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("imports.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    external_order_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    event_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_row_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    provenance: Mapped[str] = mapped_column(String(50), default="merchant_csv_import", nullable=False)
    source_row_number: Mapped[int] = mapped_column(nullable=False)

    import_record: Mapped["ImportRecord"] = relationship(back_populates="imported_records")

    __table_args__ = (
        Index("ix_imported_records_import", "import_id"),
        Index("ix_imported_records_external_ids", "external_order_id", "external_payment_id"),
    )