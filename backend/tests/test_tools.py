"""Tests for registered AI tools: prepare_resolution creates a pending proposal, refresh_payment_status is registered."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.merchant import Merchant
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.investigation import Investigation
from app.models.action import ProposedAction
from app.tools.registry import ToolRegistry
from sqlalchemy import delete, select
import uuid


@pytest.fixture(autouse=True)
async def cleanup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User))
        await db.execute(delete(Merchant))
        await db.execute(delete(ProposedAction))
        await db.execute(delete(Investigation))
        await db.execute(delete(PaymentAttempt))
        await db.execute(delete(Order))
        await db.commit()
    yield


async def _seed():
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
            external_order_id=f"ORD-{uuid.uuid4().hex[:8]}",
            currency="USD",
            total_amount="100.00",
            status="paid",
            provenance="local",
        )
        db.add(order)
        await db.flush()
        payment = PaymentAttempt(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            order_id=order.id,
            provider="paypal",
            provider_order_id="PP-ORD-TOOL-1",
            capture_id="cap_tool_1",
            currency="USD",
            amount="90.00",
            status="captured",
            provider_status="COMPLETED",
            provenance="paypal_api",
        )
        db.add(payment)
        await db.flush()
        inv = Investigation(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            created_by=user.id,
            issue_type="amount_mismatch",
            status="open",
            title="Tool test investigation",
            order_id=order.id,
            payment_attempt_id=payment.id,
            priority="high",
        )
        db.add(inv)
        await db.commit()
        return merchant, user, order, payment, inv


@pytest.mark.asyncio
async def test_registry_has_nine_tools():
    """Spec 04 tool allowlist has 9 entries including refresh_payment_status."""
    async with AsyncSessionLocal() as db:
        reg = ToolRegistry(db)
        assert len(reg.list_tools()) == 9
        assert "refresh_payment_status" in reg.list_tools()
        assert "prepare_resolution" in reg.list_tools()


@pytest.mark.asyncio
async def test_prepare_resolution_creates_pending_proposal():
    merchant, user, order, payment, inv = await _seed()

    async with AsyncSessionLocal() as db:
        reg = ToolRegistry(db)
        result = await reg.execute(
            "prepare_resolution",
            merchant_id=str(merchant.id),
            investigation_id=str(inv.id),
            action_type="refund",
            parameters={
                "target_capture_id": payment.capture_id,
                "currency": "USD",
                "amount": "90.00",
                "reason": "Amount mismatch — refund captured amount",
            },
            proposed_by=str(user.id),
        )

    assert "error" not in result, result
    assert result["proposed_action"]["status"] == "pending"

    # Row actually persisted
    async with AsyncSessionLocal() as db:
        actions = (await db.execute(
            select(ProposedAction).where(ProposedAction.investigation_id == inv.id)
        )).scalars().all()
        assert len(actions) == 1
        assert actions[0].status == "pending"
        assert str(actions[0].amount) == "90.0000"
        assert actions[0].target_capture_id == "cap_tool_1"


@pytest.mark.asyncio
async def test_prepare_resolution_blocks_duplicate_pending():
    merchant, user, order, payment, inv = await _seed()

    params = {
        "target_capture_id": payment.capture_id,
        "currency": "USD",
        "amount": "90.00",
        "reason": "refund",
    }
    async with AsyncSessionLocal() as db:
        reg = ToolRegistry(db)
        first = await reg.execute(
            "prepare_resolution",
            merchant_id=str(merchant.id),
            investigation_id=str(inv.id),
            action_type="refund",
            parameters=params,
            proposed_by=str(user.id),
        )
        assert "error" not in first

        second = await reg.execute(
            "prepare_resolution",
            merchant_id=str(merchant.id),
            investigation_id=str(inv.id),
            action_type="refund",
            parameters=params,
            proposed_by=str(user.id),
        )
    assert "error" in second
    assert "already exists" in second["error"]


@pytest.mark.asyncio
async def test_prepare_resolution_rejects_unsupported_action_and_bad_capture():
    merchant, user, order, payment, inv = await _seed()

    async with AsyncSessionLocal() as db:
        reg = ToolRegistry(db)
        bad_type = await reg.execute(
            "prepare_resolution",
            merchant_id=str(merchant.id),
            investigation_id=str(inv.id),
            action_type="void",
            parameters={"target_capture_id": payment.capture_id, "currency": "USD", "amount": "90.00", "reason": "x"},
            proposed_by=str(user.id),
        )
        assert "error" in bad_type

        bad_capture = await reg.execute(
            "prepare_resolution",
            merchant_id=str(merchant.id),
            investigation_id=str(inv.id),
            action_type="refund",
            parameters={"target_capture_id": "does_not_exist", "currency": "USD", "amount": "90.00", "reason": "x"},
            proposed_by=str(user.id),
        )
        assert "error" in bad_capture


@pytest.mark.asyncio
async def test_refresh_tool_is_registered_and_scoped():
    merchant, user, order, payment, inv = await _seed()
    other_merchant = Merchant(id=uuid.uuid4(), name="Other", default_currency="USD")
    async with AsyncSessionLocal() as db:
        db.add(other_merchant)
        await db.commit()

    async with AsyncSessionLocal() as db:
        reg = ToolRegistry(db)
        # Wrong merchant scope → not found, no PayPal call
        result = await reg.execute(
            "refresh_payment_status",
            payment_attempt_id=str(payment.id),
            merchant_id=str(other_merchant.id),
        )
        assert result == {"error": "Payment not found"}

        # Invalid UUID input → error, no crash
        result = await reg.execute(
            "refresh_payment_status",
            payment_attempt_id="not-a-uuid",
            merchant_id=str(merchant.id),
        )
        assert "error" in result


@pytest.mark.asyncio
async def test_investigate_creates_pending_proposal_via_endpoint():
    """The /run endpoint should produce a pending action when a refund is recommended."""
    merchant, user, order, payment, inv = await _seed()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"email": "demo@paypilot.ai", "password": "demo123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        response = await ac.post(f"/api/investigations/{inv.id}/run", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Amount mismatch (100 vs 90) → high severity → refund recommendation → proposal created
        assert data["proposed_action_id"] is not None

    async with AsyncSessionLocal() as db:
        action = (await db.execute(
            select(ProposedAction).where(ProposedAction.id == uuid.UUID(data["proposed_action_id"]))
        )).scalar_one()
        assert action.status == "pending"
        assert action.investigation_id == inv.id