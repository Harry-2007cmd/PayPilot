import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditEvent


class AuditService:
    """Service for recording audit events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        merchant_id: uuid.UUID,
        action: str,
        target_type: str,
        target_id: str,
        outcome: str,
        actor_user_id: Optional[uuid.UUID] = None,
        correlation_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> AuditEvent:
        """Record an audit event."""
        audit = AuditEvent(
            merchant_id=merchant_id,
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            timestamp=datetime.now(timezone.utc),
            outcome=outcome,
            correlation_id=correlation_id,
            details_redacted_json=details or {},
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(audit)
        return audit