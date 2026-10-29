from typing import Callable, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings


class ToolRegistry:
    """Registry of typed, registered backend tools for the AI agent."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._tools: Dict[str, Callable] = {}
        self._register_tools()

    def _register_tools(self):
        from app.tools.order_tool import get_order_details
        from app.tools.payment_tool import get_payment_details
        from app.tools.timeline_tool import get_event_timeline
        from app.tools.compare_tool import compare_order_payment
        from app.tools.rules_tool import run_payment_rules
        from app.tools.find_tool import find_related_records
        from app.tools.resolution_tool import prepare_resolution
        from app.tools.summary_tool import get_investigation_summary
        from app.tools.refresh_tool import refresh_payment_status

        self._tools = {
            "get_order_details": get_order_details,
            "get_payment_details": get_payment_details,
            "get_event_timeline": get_event_timeline,
            "compare_order_payment": compare_order_payment,
            "find_related_records": find_related_records,
            "run_payment_rules": run_payment_rules,
            "get_investigation_summary": get_investigation_summary,
            "prepare_resolution": prepare_resolution,
            "refresh_payment_status": refresh_payment_status,
        }

    def list_tools(self) -> list[str]:
        """List available tool names."""
        return list(self._tools.keys())

    def get_tool(self, name: str) -> Callable | None:
        """Get a tool by name."""
        return self._tools.get(name)

    async def execute(self, name: str, **kwargs) -> Any:
        """Execute a registered tool."""
        tool = self._tools.get(name)
        if not tool:
            return {"error": f"Unknown tool: {name}"}
        return await tool(self.db, **kwargs)


# Tool descriptions for the AI agent
TOOL_DESCRIPTIONS = {
    "get_order_details": "Get details for a specific order by UUID. Returns order info, payment attempts, and provenance.",
    "get_payment_details": "Get details for a specific payment attempt by UUID. Returns capture info, status, and provenance.",
    "get_event_timeline": "Get the event timeline for an order or payment. Returns chronological list of events with provenance.",
    "compare_order_payment": "Compare an order with its payment attempt. Returns deterministic mismatch findings.",
    "find_related_records": "Find related orders/payments by filters. Strictly bounded to prevent abuse.",
    "run_payment_rules": "Run deterministic payment rules for an order and payment. Returns rule findings.",
    "get_investigation_summary": "Get the summary of an investigation including findings and recommendations.",
    "prepare_resolution": "Prepare a proposed resolution action (creates pending proposal only, never executes).",
}