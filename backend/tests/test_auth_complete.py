"""Complete auth tests covering login flow, verify_password, and token handling."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.merchant import Merchant
import uuid
from sqlalchemy import delete


@pytest.fixture(autouse=True)
async def cleanup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User))
        await db.execute(delete(Merchant))
        await db.commit()
    yield


@pytest.mark.asyncio
async def test_login_valid():
    """Test that login with correct credentials works and returns tokens."""
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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "demo123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"]
        assert data["refresh_token"]
        assert data["expires_in"] == 1800  # 30 min


@pytest.mark.asyncio
async def test_login_invalid_password():
    """Test that login with wrong password returns 401."""
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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "wrongpassword123"}
        )
        assert response.status_code == 401