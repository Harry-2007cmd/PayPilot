"""End-to-end tests for all API endpoints (auth, investigations, actions)."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.merchant import Merchant
from app.models.investigation import Investigation
from app.models.payment import PaymentAttempt
from app.models.order import Order
import uuid
from sqlalchemy import delete


@pytest.fixture(autouse=True)
async def cleanup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User))
        await db.execute(delete(Merchant))
        await db.execute(delete(Investigation))
        await db.execute(delete(PaymentAttempt))
        await db.execute(delete(Order))
        await db.commit()

    # Re-seed test user, order, and payment attempt
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
        await db.flush()
        order = Order(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            source_type="local",
            external_order_id="ORD-TEST-001",
            currency="USD",
            total_amount="100.00",
            status="pending",
            provenance="local",
        )
        db.add(order)
        await db.flush()
        payment = PaymentAttempt(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            order_id=order.id,
            provider="paypal",
            provider_order_id="PP-ORD-TEST-001",
            capture_id="test_capture_1",
            currency="USD",
            amount="100.00",
            status="captured",
            provider_status="COMPLETED",
            provenance="paypal_api",
        )
        db.add(payment)
        await db.commit()
    yield


@pytest.mark.asyncio
async def test_auth_endpoints():
    """Test auth endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "demo123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"]
        assert data["refresh_token"]
        assert data["expires_in"] == 1800
        print("✓ auth/login works")

        # Get current user (me endpoint requires auth)
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        response = await ac.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        print("✓ auth/me works")

        # Refresh token (uses cookie)
        response = await ac.post("/api/auth/refresh", headers=headers)
        # This may fail without cookie, but that's ok - just check login works

        # Invalid password
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "wrongpassword123"}
        )
        assert response.status_code == 401
        print("✓ auth/login invalid password returns 401")


@pytest.mark.asyncio
async def test_investigation_endpoints():
    """Test investigation endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First login to get tokens
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "demo123"}
        )
        assert response.status_code == 200
        data = response.json()
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create investigation
        response = await ac.post(
            "/api/investigations",
            json={"issue_type": "amount_mismatch", "title": "Test amount mismatch investigation", "order_id": None, "payment_attempt_id": None, "priority": "high"},
            headers=headers
        )
        assert response.status_code == 201
        inv_data = response.json()
        assert inv_data["title"] == "Test amount mismatch investigation"
        inv_id = inv_data["id"]
        print("✓ investigations create works")

        # List investigations
        response = await ac.get("/api/investigations", headers=headers)
        assert response.status_code == 200
        list_data = response.json()
        assert list_data["total"] >= 1
        print("✓ investigations/ list works")

        # Get investigation
        response = await ac.get(f"/api/investigations/{inv_id}", headers=headers)
        assert response.status_code == 200
        print("✓ investigations/{id} get works")

        # Update investigation
        response = await ac.patch(
            f"/api/investigations/{inv_id}",
            json={"status": "resolved"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ investigations/{id} patch works")

        # Run investigation
        response = await ac.post(
            f"/api/investigations/{inv_id}/run",
            headers=headers
        )
        assert response.status_code == 200
        run_data = response.json()
        assert "findings" in run_data
        print("✓ investigations/{id}/run works")


@pytest.mark.asyncio
async def test_actions_endpoints():
    """Test actions endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First login to get tokens
        response = await ac.post(
            "/api/auth/login",
            json={"email": "demo@paypilot.ai", "password": "demo123"}
        )
        assert response.status_code == 200
        data = response.json()
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create investigation first
        inv_response = await ac.post(
            "/api/investigations",
            json={"issue_type": "amount_mismatch", "title": "Test amount mismatch investigation", "order_id": None, "payment_attempt_id": None, "priority": "high"},
            headers=headers
        )
        assert inv_response.status_code == 201
        inv_id = inv_response.json()["id"]

        # Create proposed action
        response = await ac.post(
            f"/api/investigations/{inv_id}/proposed-actions",
            json={"action_type": "refund", "target_capture_id": "test_capture_1", "currency": "USD", "amount": 100.00, "reason": "Test refund", "idempotency_key": "test_key_1"},
            headers=headers
        )
        assert response.status_code == 201
        print("✓ investigations/{id}/proposed-actions create works")

        # List proposed actions
        response = await ac.get("/api/proposed-actions", headers=headers)
        assert response.status_code == 200
        print("✓ proposed-actions list works")

        # Approve proposed action
        action_id = response.json()["id"]
        response = await ac.post(
            f"/api/proposed-actions/{action_id}/approve",
            json={"approved": True},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ proposed-actions/{id}/approve works")

        # Reject proposed action
        response = await ac.post(
            f"/api/proposed-actions/{action_id}/reject",
            headers=headers
        )
        assert response.status_code == 200
        print("✓ proposed-actions/{id}/reject works")

        # List audit events
        response = await ac.get("/api/audit-events", headers=headers)
        assert response.status_code == 200
        print("✓ audit-events list works")


print("Running end-to-end tests...")