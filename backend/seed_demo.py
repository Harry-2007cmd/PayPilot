import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.merchant import Merchant
from app.models.user import User
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.investigation import Investigation, InvestigationFinding
from sqlalchemy import select

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Check if demo merchant already exists
        result = await db.execute(select(Merchant).where(Merchant.name == "Demo Store"))
        merchant = result.scalar_one_or_none()

        if not merchant:
            merchant = Merchant(
                id=uuid.uuid4(),
                name="Demo Store",
                default_currency="USD"
            )
            db.add(merchant)
            await db.flush()
            print(f"Created merchant: {merchant.name} ({merchant.id})")

        # Check demo user
        result = await db.execute(select(User).where(User.email == "demo@paypilot.ai"))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                id=uuid.uuid4(),
                merchant_id=merchant.id,
                email="demo@paypilot.ai",
                password_hash=get_password_hash("demo123"),
                role="member"
            )
            db.add(user)
            await db.flush()
            print(f"Created user: {user.email}")

        # Check order
        result = await db.execute(select(Order).where(Order.external_order_id == "ORD-DEMO-1001"))
        order = result.scalar_one_or_none()

        if not order:
            order = Order(
                id=uuid.uuid4(),
                merchant_id=merchant.id,
                source_type="local",
                external_order_id="ORD-DEMO-1001",
                currency="USD",
                total_amount="100.00",
                status="pending",
                provenance="local"
            )
            db.add(order)
            await db.flush()
            print(f"Created order: {order.external_order_id}")

            # Mismatched payment attempt for testing rules engine
            payment = PaymentAttempt(
                id=uuid.uuid4(),
                merchant_id=merchant.id,
                order_id=order.id,
                provider="paypal",
                provider_order_id="PP-ORD-88219",
                capture_id="CAP-99120",
                currency="USD",
                amount="90.00", # Mismatch: 100 vs 90
                status="captured",
                provider_status="COMPLETED",
                provenance="paypal_api"
            )
            db.add(payment)
            await db.flush()
            print(f"Created payment attempt: {payment.capture_id}")

            # Investigation for this mismatch
            investigation = Investigation(
                id=uuid.uuid4(),
                merchant_id=merchant.id,
                created_by=user.id,
                issue_type="amount_mismatch",
                status="open",
                title="Amount mismatch on Order ORD-DEMO-1001",
                order_id=order.id,
                payment_attempt_id=payment.id,
                priority="high"
            )
            db.add(investigation)
            await db.flush()

            finding = InvestigationFinding(
                id=uuid.uuid4(),
                investigation_id=investigation.id,
                finding_type="amount_mismatch",
                severity="high",
                summary="Captured payment amount ($90.00) is less than local order total ($100.00).",
                evidence_refs_json={"order_id": str(order.id), "payment_id": str(payment.id)},
                facts_json={"order_amount": "100.00", "captured_amount": "90.00"},
                uncertainties_json={"reason": "Partial capture or missing secondary transaction"},
                recommendation="Review payment capture logs or initiate secondary capture/partial refund"
            )
            db.add(finding)
            print(f"Created investigation & finding: {investigation.title}")

        await db.commit()
        print("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
