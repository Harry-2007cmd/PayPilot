from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
import csv
import io
from decimal import Decimal
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from app.models.imports import ImportRecord, ImportedRecord
from app.schemas.imports import (
    ImportPreviewResponse, ImportPreviewRow, ImportConfirmRequest,
    ImportRecordOut, ImportRecordListResponse, ImportedRecordOut
)

router = APIRouter(prefix="/api/imports", tags=["imports"])

REQUIRED_COLUMNS = ["source_type", "currency", "amount", "status"]
OPTIONAL_COLUMNS = ["external_order_id", "external_payment_id", "event_time"]


def parse_csv(file_content: bytes) -> list[dict]:
    """Parse CSV content and return list of row dicts."""
    text = file_content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    source_label: str = "custom",
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Preview CSV import without committing."""
    if file.content_type not in ["text/csv", "application/csv"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be CSV")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 5MB)")

    rows = parse_csv(content)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV file")

    # Validate columns
    columns = set(rows[0].keys())
    missing = set(REQUIRED_COLUMNS) - columns
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required columns: {missing}")

    # Create import record
    import_record = ImportRecord(
        merchant_id=current_merchant.id,
        uploaded_by=current_user.id,
        filename=file.filename or "import.csv",
        source_label=source_label,
        row_count=len(rows),
        status="preview",
    )
    db.add(import_record)
    await db.commit()
    await db.refresh(import_record)

    # Validate rows
    valid_rows = []
    errors = []
    for i, row in enumerate(rows):
        row_errors = []
        try:
            # Validate required fields
            source_type = row.get("source_type", "").strip()
            currency = row.get("currency", "").strip().upper()
            amount_str = row.get("amount", "").strip()
            status_val = row.get("status", "").strip()

            if not source_type:
                row_errors.append("source_type is required")
            if not currency or len(currency) != 3:
                row_errors.append("currency must be 3-letter code")
            try:
                amount = Decimal(amount_str)
                if amount <= 0:
                    row_errors.append("amount must be positive")
            except:
                row_errors.append("amount must be a valid decimal")
            if not status_val:
                row_errors.append("status is required")

            # Optional fields
            external_order_id = row.get("external_order_id", "").strip() or None
            external_payment_id = row.get("external_payment_id", "").strip() or None
            event_time_str = row.get("event_time", "").strip()
            event_time = None
            if event_time_str:
                try:
                    event_time = datetime.fromisoformat(event_time_str.replace("Z", "+00:00"))
                except:
                    row_errors.append("event_time must be ISO format")

            if row_errors:
                errors.append({"row": i + 1, "errors": row_errors, "data": row})
            else:
                valid_rows.append(ImportPreviewRow(
                    source_type=source_type,
                    external_order_id=external_order_id,
                    external_payment_id=external_payment_id,
                    currency=currency,
                    amount=amount,
                    status=status_val,
                    event_time=event_time,
                    raw_data=row,
                    row_number=i + 1,
                ))

        except Exception as e:
            errors.append({"row": i + 1, "errors": [str(e)], "data": row})

    import_record.valid_count = len(valid_rows)
    import_record.error_count = len(errors)
    import_record.raw_data_json = [r.model_dump(mode="json") for r in valid_rows]
    await db.commit()

    return ImportPreviewResponse(
        import_id=import_record.id,
        filename=import_record.filename,
        source_label=source_label,
        total_rows=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=len(errors),
        errors=errors,
        preview=valid_rows[:100],  # Limit preview to first 100
    )


@router.post("/confirm", response_model=ImportRecordOut)
async def confirm_import(
    request: ImportConfirmRequest,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    """Confirm and commit a previewed import."""
    if not request.confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must confirm import")

    result = await db.execute(
        select(ImportRecord).where(
            ImportRecord.id == request.import_id,
            ImportRecord.merchant_id == current_merchant.id,
            ImportRecord.status == "preview"
        )
    )
    import_record = result.scalar_one_or_none()
    if not import_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import preview not found or already processed")

    # Mark completed and insert validated rows
    import_record.status = "completed"
    import_record.completed_at = datetime.now(timezone.utc)

    for row_data in (import_record.raw_data_json or []):
        event_time = None
        if row_data.get("event_time"):
            try:
                event_time = datetime.fromisoformat(row_data["event_time"])
            except Exception:
                pass
        imported_rec = ImportedRecord(
            id=uuid.uuid4(),
            import_id=import_record.id,
            source_type=row_data.get("source_type", "custom"),
            external_order_id=row_data.get("external_order_id"),
            external_payment_id=row_data.get("external_payment_id"),
            currency=row_data.get("currency", "USD"),
            amount=Decimal(str(row_data.get("amount", "0"))),
            status=row_data.get("status", "unknown"),
            event_time=event_time,
            raw_row_json=row_data.get("raw_data", {}),
            provenance="merchant_csv_import",
            source_row_number=row_data.get("row_number", 0),
        )
        db.add(imported_rec)

    await db.commit()
    await db.refresh(import_record)
    return import_record


@router.get("", response_model=ImportRecordListResponse)
async def list_imports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    query = select(ImportRecord).where(ImportRecord.merchant_id == current_merchant.id)
    if status_filter:
        query = query.where(ImportRecord.status == status_filter)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.order_by(ImportRecord.uploaded_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    imports = result.scalars().all()
    return ImportRecordListResponse(items=imports, total=total, page=page, page_size=page_size)


@router.get("/{import_id}", response_model=ImportRecordOut)
async def get_import(
    import_id: uuid.UUID,
    current_user = Depends(get_current_user),
    current_merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ImportRecord).where(
            ImportRecord.id == import_id,
            ImportRecord.merchant_id == current_merchant.id
        )
    )
    import_record = result.scalar_one_or_none()
    if not import_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import not found")
    return import_record