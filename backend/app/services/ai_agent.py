from typing import Optional
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.models.investigation import Investigation, InvestigationFinding
from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.event import ProviderEvent
from app.models.audit import AuditEvent
from app.services.rules_engine import RulesEngine
from app.services.paypal_adapter import PayPalAdapter
from app.core.config import settings


class AIAgent:
    """AI investigation agent using registered backend tools."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.rules_engine = RulesEngine(db)

    # ===== Registered Tools =====

    async def get_order_details(self, order_id: uuid.UUID, merchant_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.payment_attempts))
            .where(Order.id == order_id, Order.merchant_id == merchant_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            return {"error": "Order not found"}
        return {
            "id": str(order.id),
            "external_order_id": order.external_order_id,
            "source_type": order.source_type,
            "currency": order.currency,
            "total_amount": str(order.total_amount),
            "status": order.status,
            "provenance": order.provenance,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat(),
            "payment_attempts": [
                {
                    "id": str(p.id),
                    "provider_order_id": p.provider_order_id,
                    "capture_id": p.capture_id,
                    "currency": p.currency,
                    "amount": str(p.amount),
                    "status": p.status,
                    "provider_status": p.provider_status,
                    "provenance": p.provenance,
                }
                for p in order.payment_attempts
            ],
        }

    async def get_payment_details(self, payment_attempt_id: uuid.UUID, merchant_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(PaymentAttempt).where(
                PaymentAttempt.id == payment_attempt_id,
                PaymentAttempt.merchant_id == merchant_id
            )
        )
        payment = result.scalar_one_or_none()
        if not payment:
            return {"error": "Payment not found"}
        return {
            "id": str(payment.id),
            "order_id": str(payment.order_id),
            "provider": payment.provider,
            "provider_order_id": payment.provider_order_id,
            "capture_id": payment.capture_id,
            "currency": payment.currency,
            "amount": str(payment.amount),
            "status": payment.status,
            "provider_status": payment.provider_status,
            "provenance": payment.provenance,
            "created_at": payment.created_at.isoformat(),
            "last_verified_at": payment.last_verified_at.isoformat() if payment.last_verified_at else None,
        }

    async def get_event_timeline(self, merchant_id: uuid.UUID, order_id: Optional[uuid.UUID] = None, payment_attempt_id: Optional[uuid.UUID] = None) -> list[dict]:
        events = []

        if payment_attempt_id:
            payment_result = await self.db.execute(
                select(PaymentAttempt).where(
                    PaymentAttempt.id == payment_attempt_id,
                    PaymentAttempt.merchant_id == merchant_id
                )
            )
            payment = payment_result.scalar_one_or_none()
            if payment:
                events.append({
                    "event_time": payment.created_at.isoformat(),
                    "event_type": "payment_created",
                    "source": "local",
                    "status": payment.status,
                    "details": {"payment_id": str(payment.id), "amount": str(payment.amount), "currency": payment.currency},
                    "provenance": payment.provenance,
                })

                if payment.capture_id:
                    event_result = await self.db.execute(
                        select(ProviderEvent).where(
                            ProviderEvent.merchant_id == merchant_id,
                            ProviderEvent.payload_minimized_json["resource_id"].astext == payment.capture_id,
                        )
                    )
                    for event in event_result.scalars().all():
                        events.append({
                            "event_time": event.event_time.isoformat(),
                            "event_type": event.event_type,
                            "source": "provider_event",
                            "status": event.payload_minimized_json.get("status", "unknown"),
                            "details": event.payload_minimized_json,
                            "provenance": "provider_event",
                        })

        return sorted(events, key=lambda e: e["event_time"])

    async def compare_order_payment(
        self,
        order_id: uuid.UUID,
        payment_attempt_id: Optional[uuid.UUID] = None,
        merchant_id: uuid.UUID = None
    ) -> dict:
        return await self.rules_engine.check_order_payment(order_id, payment_attempt_id)

    async def find_related_records(self, merchant_id: uuid.UUID, filters: dict) -> dict:
        """Find related orders/payments with strict bounds."""
        query = select(Order).where(Order.merchant_id == merchant_id)
        if filters.get("currency"):
            query = query.where(Order.currency == filters["currency"])
        if filters.get("status"):
            query = query.where(Order.status == filters["status"])
        if filters.get("min_amount"):
            query = query.where(Order.total_amount >= filters["min_amount"])
        if filters.get("max_amount"):
            query = query.where(Order.total_amount <= filters["max_amount"])
        if filters.get("source_type"):
            query = query.where(Order.source_type == filters["source_type"])

        # Limit to prevent abuse
        query = query.limit(50)
        result = await self.db.execute(query)
        orders = result.scalars().all()

        return {
            "orders": [
                {
                    "id": str(o.id),
                    "external_order_id": o.external_order_id,
                    "currency": o.currency,
                    "total_amount": str(o.total_amount),
                    "status": o.status,
                }
                for o in orders
            ],
            "count": len(orders),
        }

    async def run_payment_rules(self, order_id: uuid.UUID, payment_attempt_id: Optional[uuid.UUID], merchant_id: uuid.UUID) -> dict:
        return await self.rules_engine.check_order_payment(order_id, payment_attempt_id)

    async def prepare_resolution(
        self,
        investigation_id: uuid.UUID,
        action_type: str,
        parameters: dict,
        merchant_id: uuid.UUID,
        proposed_by: uuid.UUID
    ) -> dict:
        """Create a pending proposed action (never executes). Spec 04 tool 9."""
        from app.tools.resolution_tool import prepare_resolution as _prepare
        return await _prepare(
            db=self.db,
            merchant_id=str(merchant_id),
            investigation_id=str(investigation_id),
            action_type=action_type,
            parameters=parameters,
            proposed_by=str(proposed_by),
        )

    async def get_investigation_summary(self, investigation_id: uuid.UUID, merchant_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(Investigation)
            .options(selectinload(Investigation.findings))
            .where(Investigation.id == investigation_id, Investigation.merchant_id == merchant_id)
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

    async def refresh_payment_status(self, payment_attempt_id: uuid.UUID, merchant_id: uuid.UUID) -> dict:
        """Refresh a payment's status from PayPal and return comparison."""
        payment_result = await self.db.execute(
            select(PaymentAttempt).where(
                PaymentAttempt.id == payment_attempt_id,
                PaymentAttempt.merchant_id == merchant_id
            )
        )
        payment = payment_result.scalar_one_or_none()
        if not payment:
            return {"error": "Payment not found"}
        if not payment.capture_id:
            return {"error": "No capture ID to refresh"}

        old_status = payment.status
        old_provider_status = payment.provider_status

        try:
            adapter = PayPalAdapter()
            capture_data = await adapter.get_capture(payment.capture_id)
            new_provider_status = capture_data.get("status", "UNKNOWN")

            discrepancies = []
            if old_provider_status != new_provider_status:
                discrepancies.append({
                    "field": "provider_status",
                    "local": old_provider_status,
                    "provider": new_provider_status,
                })

            return {
                "payment_id": str(payment.id),
                "capture_id": payment.capture_id,
                "old_status": old_status,
                "old_provider_status": old_provider_status,
                "new_provider_status": new_provider_status,
                "verified": True,
                "discrepancies": discrepancies,
            }
        except Exception as e:
            return {
                "payment_id": str(payment.id),
                "verified": False,
                "error": f"Could not reach PayPal: {str(e)[:200]}",
            }

    # ===== Main Investigation Flow =====

    async def investigate(
        self,
        investigation_id: Optional[uuid.UUID],
        merchant_id: uuid.UUID,
        order_id: Optional[uuid.UUID] = None,
        payment_attempt_id: Optional[uuid.UUID] = None,
        question: Optional[str] = None,
        proposed_by: Optional[uuid.UUID] = None,
    ) -> dict:
        """Run full investigation using deterministic checks and AI reasoning."""
        facts = []
        uncertainties = []
        evidence_refs = {}
        proposed_action_id = None

        # Step 1: Run deterministic rules if we have order/payment
        rule_findings = []
        if order_id:
            rule_result = await self.rules_engine.check_order_payment(order_id, payment_attempt_id)
            rule_findings = rule_result.get("findings", [])

        # Step 2: Collect evidence
        if order_id:
            order_details = await self.get_order_details(order_id, merchant_id)
            evidence_refs["order"] = order_details
            if "error" not in order_details:
                facts.append({
                    "statement": f"Order {order_details['external_order_id']} exists with amount {order_details['total_amount']} {order_details['currency']}",
                    "evidence": "order",
                    "verified": order_details["provenance"] in ["paypal_api", "paypal_api_refresh"],
                })

        if payment_attempt_id:
            payment_details = await self.get_payment_details(payment_attempt_id, merchant_id)
            evidence_refs["payment"] = payment_details
            if "error" not in payment_details:
                facts.append({
                    "statement": f"Payment {payment_details['capture_id']} exists with amount {payment_details['amount']} {payment_details['currency']}",
                    "evidence": "payment",
                    "verified": payment_details["provenance"] in ["paypal_api", "paypal_api_refresh"],
                })

        # Step 3: Add rule findings as facts/uncertainties
        for finding in rule_findings:
            if finding["severity"] == "high":
                facts.append({
                    "statement": finding["summary"],
                    "evidence": "rules_engine",
                    "verified": True,
                })
            else:
                uncertainties.append({
                    "statement": finding["summary"],
                    "reason": "Rule flagged but requires context",
                    "evidence": "rules_engine",
                })

        # Step 4: Determine recommendation
        recommendation = self._generate_recommendation(rule_findings, order_id, payment_attempt_id)

        # Step 5: Create a pending proposal when a refund is recommended
        if recommendation.get("action_type") == "refund" and payment_attempt_id and proposed_by and investigation_id:
            payment_details = evidence_refs.get("payment") or {}
            if "error" not in payment_details and payment_details.get("capture_id"):
                proposed_action_id = await self._propose_refund(
                    investigation_id=investigation_id,
                    payment_details=payment_details,
                    merchant_id=merchant_id,
                    proposed_by=proposed_by,
                )

        # Step 6: Generate summary
        summary = self._generate_summary(facts, uncertainties, rule_findings, question)

        # Step 7: Determine confidence
        confidence = self._calculate_confidence(facts, uncertainties, rule_findings)

        # Step 8: Determine if human review needed
        needs_human_review = len(uncertainties) > 0 or any(f["severity"] == "high" for f in rule_findings)

        # Build issue_type
        issue_type = "general"
        if rule_findings:
            types = [f["type"] for f in rule_findings]
            if "amount_mismatch" in types:
                issue_type = "amount_mismatch"
            elif "currency_mismatch" in types:
                issue_type = "currency_mismatch"
            elif "status_mismatch" in types:
                issue_type = "status_mismatch"
            elif "duplicate_event" in types:
                issue_type = "duplicate_event"

        # Persist findings if we have an investigation record
        if investigation_id:
            await self._persist_findings(investigation_id, rule_findings)

        return {
            "summary": summary,
            "issue_type": issue_type,
            "facts": facts,
            "uncertainties": uncertainties,
            "recommendation": recommendation.get("text", "Review the evidence and determine next steps"),
            "proposed_action_id": proposed_action_id,
            "confidence": confidence,
            "needs_human_review": needs_human_review,
            "findings": [
                {
                    "type": f["type"],
                    "severity": f["severity"],
                    "summary": f["summary"],
                    "recommendation": f.get("recommendation", ""),
                }
                for f in rule_findings
            ],
        }

    async def _persist_findings(self, investigation_id: uuid.UUID, rule_findings: list[dict]) -> None:
        """Replace stale findings for an investigation with the current run's findings."""
        await self.db.execute(
            delete(InvestigationFinding).where(
                InvestigationFinding.investigation_id == investigation_id
            )
        )
        for f in rule_findings:
            self.db.add(InvestigationFinding(
                id=uuid.uuid4(),
                investigation_id=investigation_id,
                finding_type=f["type"],
                severity=f["severity"],
                summary=f["summary"],
                evidence_refs_json=f.get("evidence_refs", {}),
                facts_json=f.get("facts", {}),
                uncertainties_json=f.get("uncertainties", {}),
                recommendation=f.get("recommendation", ""),
            ))
        await self.db.commit()

    async def _propose_refund(
        self,
        investigation_id: uuid.UUID,
        payment_details: dict,
        merchant_id: uuid.UUID,
        proposed_by: uuid.UUID,
    ) -> Optional[uuid.UUID]:
        """Create a pending refund proposal from the verified payment. Never executes."""
        from app.tools.resolution_tool import prepare_resolution as _prepare

        result = await _prepare(
            db=self.db,
            merchant_id=str(merchant_id),
            investigation_id=str(investigation_id),
            action_type="refund",
            parameters={
                "target_capture_id": payment_details.get("capture_id"),
                "currency": payment_details.get("currency"),
                "amount": payment_details.get("amount"),
                "reason": "Refund proposed by AI investigation based on deterministic mismatch findings",
                "idempotency_key": f"ai-refund:{payment_details.get('capture_id')}:{investigation_id}",
            },
            proposed_by=str(proposed_by),
        )
        if "error" in result:
            return None
        return uuid.UUID(result["proposed_action"]["id"])

    def _generate_recommendation(self, rule_findings: list, order_id: Optional[uuid.UUID], payment_attempt_id: Optional[uuid.UUID]) -> dict:
        if not rule_findings:
            return {"text": "No discrepancies detected. The order and payment records appear consistent.", "action_type": None}

        high_severity = [f for f in rule_findings if f["severity"] == "high"]
        if not high_severity:
            return {"text": "Minor discrepancies detected. Review the evidence and consider manual verification.", "action_type": None}

        # High severity findings - recommend specific actions
        finding_types = {f["type"] for f in high_severity}
        if "amount_mismatch" in finding_types or "currency_mismatch" in finding_types:
            if payment_attempt_id:
                return {
                    "text": "Amount/currency mismatch detected. If the payment was captured incorrectly, consider a refund for the captured amount.",
                    "action_type": "refund",
                    "parameters": {
                        "target_capture_id": "payment_attempt.capture_id",  # Placeholder
                        "amount": "payment_attempt.amount",
                        "currency": "payment_attempt.currency",
                    }
                }
        if "status_mismatch" in finding_types:
            return {"text": "Status mismatch detected. Reconcile the order status with the payment status.", "action_type": None}

        return {"text": "Review the discrepancies and determine appropriate action.", "action_type": None}

    def _generate_summary(self, facts: list, uncertainties: list, rule_findings: list, question: Optional[str]) -> str:
        lines = []
        if question:
            lines.append(f"Investigating: {question}")
        else:
            lines.append("Investigating payment discrepancy.")

        if rule_findings:
            lines.append(f"Deterministic checks found {len(rule_findings)} issue(s):")
            for f in rule_findings:
                lines.append(f"  - {f['type']}: {f['summary']}")
        else:
            lines.append("No deterministic discrepancies found.")

        if facts:
            lines.append(f"Verified facts ({len(facts)}):")
            for f in facts[:3]:
                lines.append(f"  - {f['statement']}")

        if uncertainties:
            lines.append(f"Uncertainties ({len(uncertainties)}):")
            for u in uncertainties[:3]:
                lines.append(f"  - {u['statement']}")

        return "\n".join(lines)

    def _calculate_confidence(self, facts: list, uncertainties: list, rule_findings: list) -> str:
        verified_facts = sum(1 for f in facts if f.get("verified", False))
        total_facts = len(facts)
        high_severity = sum(1 for f in rule_findings if f["severity"] == "high")

        if high_severity > 0 and verified_facts > 0:
            return "high"
        elif verified_facts > 0 and len(uncertainties) == 0:
            return "medium"
        else:
            return "low"