from typing import Optional
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent


class RulesEngine:
    """Deterministic rules engine for payment discrepancy detection."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_order_payment(
        self,
        order_id: uuid.UUID,
        payment_attempt_id: Optional[uuid.UUID] = None
    ) -> dict:
        """Run all rule checks between an order and its payment attempts."""
        order_result = await self.db.execute(
            select(Order).where(Order.id == order_id)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            return {"findings": [], "error": "Order not found"}

        if payment_attempt_id:
            payment_result = await self.db.execute(
                select(PaymentAttempt).where(
                    PaymentAttempt.id == payment_attempt_id,
                    PaymentAttempt.order_id == order_id
                )
            )
            payments = [payment_result.scalar_one_or_none()]
        else:
            payment_result = await self.db.execute(
                select(PaymentAttempt).where(PaymentAttempt.order_id == order_id)
            )
            payments = list(payment_result.scalars().all())

        findings = []
        for payment in payments:
            if payment:
                findings.extend(await self._check_amount_currency(order, payment))
                findings.extend(await self._check_status_consistency(order, payment))
                findings.extend(await self._check_duplicate_events(payment))

        return {"order_id": str(order_id), "payment_count": len(payments), "findings": findings}

    async def _check_amount_currency(self, order: Order, payment: PaymentAttempt) -> list[dict]:
        findings = []
        if order.currency != payment.currency:
            findings.append({
                "type": "currency_mismatch",
                "severity": "high",
                "summary": f"Currency mismatch: order={order.currency}, payment={payment.currency}",
                "details": {
                    "order_currency": order.currency,
                    "payment_currency": payment.currency,
                },
            })
        if order.total_amount != payment.amount:
            findings.append({
                "type": "amount_mismatch",
                "severity": "high",
                "summary": f"Amount mismatch: order={order.total_amount} {order.currency}, payment={payment.amount} {payment.currency}",
                "details": {
                    "order_amount": str(order.total_amount),
                    "payment_amount": str(payment.amount),
                },
            })
        return findings

    async def _check_status_consistency(self, order: Order, payment: PaymentAttempt) -> list[dict]:
        findings = []
        if order.status == "paid" and payment.status != "captured":
            findings.append({
                "type": "status_mismatch",
                "severity": "medium",
                "summary": f"Order marked paid but payment not captured: order={order.status}, payment={payment.status}",
                "details": {"order_status": order.status, "payment_status": payment.status},
            })
        if order.status in ["cancelled", "expired"] and payment.status == "captured":
            findings.append({
                "type": "status_mismatch",
                "severity": "high",
                "summary": f"Order cancelled/expired but payment captured: order={order.status}, payment={payment.status}",
                "details": {"order_status": order.status, "payment_status": payment.status},
            })
        return findings

    async def _check_duplicate_events(self, payment: PaymentAttempt) -> list[dict]:
        """Check for duplicate webhook events for the same capture."""
        if not payment.capture_id:
            return []

        result = await self.db.execute(
            select(ProviderEvent).where(
                ProviderEvent.merchant_id == payment.merchant_id,
                ProviderEvent.payload_minimized_json["resource_id"].astext == payment.capture_id,
                ProviderEvent.event_type.ilike("%CAPTURE%"),
            )
        )
        events = list(result.scalars().all())

        if len(events) > 1:
            return [{
                "type": "duplicate_event",
                "severity": "medium",
                "summary": f"Duplicate capture events detected for capture {payment.capture_id}",
                "details": {
                    "capture_id": payment.capture_id,
                    "event_count": len(events),
                    "event_ids": [str(e.id) for e in events],
                },
            }]
        return []

    async def check_failed_checkout(self, order_id: uuid.UUID) -> list[dict]:
        """Check for failed or cancelled checkout."""
        result = await self.db.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            return []

        if order.status in ["cancelled", "expired", "failed"]:
            return [{
                "type": "failed_checkout",
                "severity": "medium",
                "summary": f"Checkout {order.status}: order {order.external_order_id}",
                "details": {"order_status": order.status},
            }]
        return []