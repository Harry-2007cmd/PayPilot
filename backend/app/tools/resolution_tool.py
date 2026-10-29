import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.investigation import Investigation
from app.models.action import ProposedAction
from app.models.payment import PaymentAttempt
from app.services.audit_service import AuditService


async def prepare_resolution(
    db: AsyncSession,
    merchant_id: str,
    investigation_id: str,
    action_type: str,
    parameters: dict,
    proposed_by: str
) -> dict:
    """Create a pending proposed action (never executes). Spec 04 tool 9."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
        investigation_uuid = uuid.UUID(investigation_id)
        proposed_by_uuid = uuid.UUID(proposed_by)
    except (ValueError, TypeError):
        return {"error": "Invalid IDs"}

    if action_type != "refund":
        return {"error": "Unsupported action_type. Only 'refund' is supported."}

    inv_result = await db.execute(
        select(Investigation).where(
            Investigation.id == investigation_uuid,
            Investigation.merchant_id == merchant_uuid
        )
    )
    investigation = inv_result.scalar_one_or_none()
    if not investigation:
        return {"error": "Investigation not found"}

    # Check for existing pending action
    existing = await db.execute(
        select(ProposedAction).where(
            ProposedAction.investigation_id == investigation_uuid,
            ProposedAction.status == "pending"
        )
    )
    if existing.scalar_one_or_none():
        return {"error": "Pending action already exists for this investigation"}

    target_capture_id = parameters.get("target_capture_id")
    currency = (parameters.get("currency") or "").upper()
    amount = parameters.get("amount")
    reason = parameters.get("reason") or "Refund proposed by AI investigation"

    if not target_capture_id or not currency or amount is None:
        return {"error": "parameters must include target_capture_id, currency, and amount"}

    # Verify the capture exists, is merchant-scoped, and is eligible for refund
    payment_result = await db.execute(
        select(PaymentAttempt).where(
            PaymentAttempt.merchant_id == merchant_uuid,
            PaymentAttempt.capture_id == target_capture_id,
            PaymentAttempt.status == "captured",
        )
    )
    payment = payment_result.scalar_one_or_none()
    if not payment:
        return {"error": "Capture not found or not eligible for refund"}

    idempotency_key = parameters.get("idempotency_key") or f"refund:{target_capture_id}:{investigation_uuid}"
    existing_key = await db.execute(
        select(ProposedAction).where(ProposedAction.idempotency_key == idempotency_key)
    )
    if existing_key.scalar_one_or_none():
        return {"error": "Action with this idempotency key already exists"}

    proposed_action = ProposedAction(
        merchant_id=merchant_uuid,
        investigation_id=investigation_uuid,
        action_type=action_type,
        target_capture_id=target_capture_id,
        currency=currency,
        amount=amount,
        reason=reason,
        status="pending",
        proposed_by=proposed_by_uuid,
        idempotency_key=idempotency_key,
    )
    db.add(proposed_action)
    await db.commit()
    await db.refresh(proposed_action)

    audit = AuditService(db)
    await audit.log(
        merchant_id=merchant_uuid,
        actor_user_id=proposed_by_uuid,
        action="proposed_action_created",
        target_type="proposed_action",
        target_id=str(proposed_action.id),
        outcome="success",
        details={"action_type": action_type, "amount": str(amount), "currency": currency},
    )

    return {
        "message": "Pending proposed action created. Requires human approval before execution.",
        "proposed_action": {
            "id": str(proposed_action.id),
            "investigation_id": str(investigation_uuid),
            "action_type": action_type,
            "target_capture_id": target_capture_id,
            "currency": currency,
            "amount": str(amount),
            "reason": reason,
            "status": "pending",
            "idempotency_key": idempotency_key,
        },
    }