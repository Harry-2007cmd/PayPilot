import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from sqlalchemy import delete


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data


@pytest.mark.asyncio
async def test_verify_password():
    """Test that verify_password works correctly with hashed passwords."""
    hashed = get_password_hash("demo123")
    assert verify_password("demo123", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


@pytest.mark.asyncio
async def test_login_invalid():
    # Initialize database first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/auth/login", json={"email": "test@test.com", "password": "wrong"})
        assert response.status_code == 401

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)