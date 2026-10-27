"""Tests for CSV import preview/confirm and AI investigation findings persistence."""
import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.merchant import Merchant
from app.models.imports import ImportRecord, ImportedRecord
from app.models.investigation import Investigation, InvestigationFinding
from sqlalchemy import delete, select
import uuid


@pytest.fixture(autouse=True)
async def cleanup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User))
        await db.execute(delete(Merchant))
        await db.execute(delete(ImportedRecord))
        await db.execute(delete(ImportRecord))
        await db.execute(delete(InvestigationFinding))
        await db.execute(delete(Investigation))
        await db.commit()

    async with AsyncSessionLocal() as db:
        merchant = Merchant(id=uuid.uuid4(), name="Test Merchant", default_currency="USD")
        db.add(merchant)
        await db.flush()
        user = User(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            email="demo@paypilot.ai",
            password_hash=get_password_hash("demo123"),
            role="member",
        )
        db.add(user)
        await db.commit()
    yield


def _csv_bytes() -> bytes:
    return (
        "source_type,currency,amount,status,external_order_id,external_payment_id\n"
        "paypal_api,USD,50.00,captured,ORD-001,CAP-001\n"
        "paypal_api,USD,25.50,captured,ORD-002,CAP-002\n"
    ).encode("utf-8")


@pytest.mark.asyncio
async def test_preview_import():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"email": "demo@paypilot.ai", "password": "demo123"})
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        response = await ac.post(
            "/api/imports/preview",
            headers=headers,
            files={"file": ("orders.csv", _csv_bytes(), "text/csv")},
            data={"source_label": "marketplace"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 2
        assert data["valid_rows"] == 2
        assert data["invalid_rows"] == 0
        assert len(data["preview"]) == 2
        import_id = data["import_id"]

        # ImportRecord exists in preview state
        async with AsyncSessionLocal() as db:
            rec = (await db.execute(select(ImportRecord).where(ImportRecord.id == uuid.UUID(import_id)))).scalar_one()
            assert rec.status == "preview"
            assert rec.valid_count == 2
            assert len(rec.raw_data_json) == 2

        return import_id


@pytest.mark.asyncio
async def test_confirm_import_persists_rows():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"email": "demo@paypilot.ai", "password": "demo123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        preview = await ac.post(
            "/api/imports/preview",
            headers=headers,
            files={"file": ("orders.csv", _csv_bytes(), "text/csv")},
        )
        assert preview.status_code == 200
        import_id = preview.json()["import_id"]

        # Confirm
        response = await ac.post(
            "/api/imports/confirm",
            headers=headers,
            json={"import_id": import_id, "confirm": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None

        # ImportedRecord rows were written
        async with AsyncSessionLocal() as db:
            recs = (await db.execute(
                select(ImportedRecord).where(ImportedRecord.import_id == uuid.UUID(import_id))
            )).scalars().all()
            assert len(recs) == 2
            assert all(r.provenance == "merchant_csv_import" for r in recs)
            assert {r.external_order_id for r in recs} == {"ORD-001", "ORD-002"}

        # Re-confirming is blocked (no longer in preview state)
        response = await ac.post(
            "/api/imports/confirm",
            headers=headers,
            json={"import_id": import_id, "confirm": True},
        )
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_ai_investigation_persists_findings():
    """run_investigation should persist InvestigationFinding rows."""
    async with AsyncSessionLocal() as db:
        merchant = (await db.execute(select(Merchant))).scalar_one()
        user = (await db.execute(select(User))).scalar_one()
        inv = Investigation(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            created_by=user.id,
            issue_type="amount_mismatch",
            status="open",
            title="Test investigation",
            priority="high",
        )
        db.add(inv)
        await db.commit()
        inv_id = inv.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"email": "demo@paypilot.ai", "password": "demo123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        response = await ac.post(f"/api/investigations/{inv_id}/run", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "findings" in data

    # Findings persisted
    async with AsyncSessionLocal() as db:
        findings = (await db.execute(
            select(InvestigationFinding).where(InvestigationFinding.investigation_id == inv_id)
        )).scalars().all()
        assert len(findings) == len(data["findings"])