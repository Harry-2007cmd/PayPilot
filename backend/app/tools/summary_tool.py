import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.investigation import Investigation, InvestigationFinding


async def get_investigation_summary(
    db: AsyncSession,
    merchant_id: str,
    investigation_id: str
) -> dict:
    """Get investigation summary with findings."""
    try:
        merchant_uuid = uuid.UUID(merchant_id)
        investigation_uuid = uuid.UUID(investigation_id)
    except (ValueError, TypeError):
        return {"error": "Invalid merchant_id or investigation_id"}

    result = await db.execute(
        select(Investigation)
        .options(selectinload(Investigation.findings))
        .where(Investigation.id == investigation_uuid, Investigation.merchant_id == merchant_uuid)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        return {"error": "Investigation not found"}

    return {
        "id": str(investigation.id),
        "issue_type": investigation.issue_type,
        "status": investigation.status,
        "title": investigation.title,
        "priority": investigation.priority,
        "findings_count": len(investigation.findings),
        "findings": [
            {
                "type": f.finding_type,
                "severity": f.severity,
                "summary": f.summary,
                "recommendation": f.recommendation,
            }
            for f in investigation.findings
        ],
    }