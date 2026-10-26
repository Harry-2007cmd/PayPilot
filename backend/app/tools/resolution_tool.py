import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.investigation import Investigation
from app.models.action import ProposedAction


async def prepare_resolution(
    db: AsyncSession,
    merchant_id: str,
    investigation_id: str,
    action_type: str,
    parameters: dict,
    proposed_by: str
) -> dict:
    """Prepare a pending proposed action (creates proposal only, never executes)."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
        investigation_uuid = uuid.UUID(investigation_id)
        proposed_by_uuid = uuid.UUID(proposed_by)
    except (ValueError, TypeError):
        return {"error": "Invalid IDs"}

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

    return {
        "message": "Action proposal prepared - use the approval endpoint to create it",
        "proposed_action": {
            "investigation_id": str(investigation_uuid),
            "action_type": action_type,
            "target_capture_id": parameters.get("target_capture_id"),
            "currency": parameters.get("currency"),
            "amount": parameters.get("amount"),
            "reason": parameters.get("reason"),
        },
    }