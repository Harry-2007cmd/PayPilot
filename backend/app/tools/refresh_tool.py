import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.payment import PaymentAttempt
from app.models.audit import AuditEvent
from app.services.paypal_adapter import PayPalAdapter


async def refresh_payment_status(
    db: AsyncSession,
    payment_attempt_id: str,
    merchant_id: str,
) -> dict:
    """Retrieve the current PayPal capture status on demand and update local
    state through valid transitions only. Spec 04 tool 8, spec 02 verification flow."""
    try:
        payment_uuid = uuid.UUID(payment_attempt_id)
        merchant_uuid = uuid.UUID(merchant_id)
    except (ValueError, TypeError):
        return {"error": "Invalid payment_attempt_id or merchant_id"}

    result = await db.execute(
        select(PaymentAttempt).where(
            PaymentAttempt.id == payment_uuid,
            PaymentAttempt.merchant_id == merchant_uuid,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return {"error": "Payment not found"}
    if not payment.capture_id:
        return {"error": "No capture ID to refresh"}

    old_status = payment.status
    old_provider_status = payment.provider_status

    try:
        adapter = PayPalAdapter()
        capture_data = await adapter.get_capture(payment.capture_id)
    except Exception as e:
        audit = AuditEvent(
            id=uuid.uuid4(),
            merchant_id=merchant_uuid,
            actor_user_id=None,
            action="payment_refresh_failed",
            target_type="payment_attempt",
            target_id=str(payment.id),
            timestamp=datetime.now(timezone.utc),
            outcome="error",
            details_redacted_json={"error": str(e)[:500]},
        )
        db.add(audit)
        await db.commit()
        return {
            "payment_id": str(payment.id),
            "capture_id": payment.capture_id,
            "verified": False,
            "error": f"Could not reach PayPal: {str(e)[:200]}",
        }

    provider_status = capture_data.get("status", "")
    payment.provider_status = provider_status
    payment.last_verified_at = datetime.now(timezone.utc)
    payment.provenance = "paypal_api_refresh"

    discrepancies = []
    if old_provider_status != provider_status:
        discrepancies.append({
            "field": "provider_status",
            "local": old_provider_status,
            "provider": provider_status,
        })

    if provider_status == "REFUNDED" and payment.status == "captured":
        payment.status = "refunded"
    elif provider_status == "PARTIALLY_REFUNDED" and payment.status == "captured":
        payment.status = "partially_refunded"

    audit = AuditEvent(
        id=uuid.uuid4(),
        merchant_id=merchant_uuid,
        actor_user_id=None,
        action="payment_refreshed",
        target_type="payment_attempt",
        target_id=str(payment.id),
        timestamp=datetime.now(timezone.utc),
        outcome="success",
        details_redacted_json={
            "old_status": old_status,
            "new_status": payment.status,
            "provider_status": provider_status,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(payment)

    return {
        "payment_id": str(payment.id),
        "capture_id": payment.capture_id,
        "old_status": old_status,
        "old_provider_status": old_provider_status,
        "new_provider_status": provider_status,
        "new_status": payment.status,
        "verified": True,
        "discrepancies": discrepancies,
    }