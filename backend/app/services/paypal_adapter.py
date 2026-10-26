import httpx
import base64
import json
from typing import Optional
from datetime import datetime, timedelta

from app.core.config import settings


class PayPalAdapter:
    """PayPal REST API adapter for Sandbox operations."""

    def __init__(self):
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.base_url = settings.PAYPAL_BASE_URL
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def _get_access_token(self) -> str:
        """Get or refresh OAuth access token."""
        if self._access_token and self._token_expires_at and datetime.now() < self._token_expires_at - timedelta(minutes=1):
            return self._access_token

        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = "grant_type=client_credentials"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers=headers,
                content=data,
                timeout=30.0,
            )
            response.raise_for_status()
            token_data = response.json()
            self._access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 32000)
            self._token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            return self._access_token

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        """Make authenticated request to PayPal API."""
        token = await self._get_access_token()
        headers = kwargs.pop("headers", {})
        idempotency_key = kwargs.pop("idempotency_key", "")
        headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        })
        if idempotency_key:
            headers["PayPal-Request-Id"] = idempotency_key

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=headers,
                timeout=30.0,
                **kwargs,
            )
            if response.status_code >= 400:
                raise Exception(f"PayPal API error {response.status_code}: {response.text}")
            return response.json()

    async def create_order(self, amount: str, currency: str, reference_id: str) -> dict:
        """Create a PayPal order."""
        return await self._request(
            "POST",
            "/v2/checkout/orders",
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": reference_id,
                    "amount": {
                        "currency_code": currency,
                        "value": amount,
                    },
                }],
            },
        )

    async def capture_order(self, order_id: str) -> dict:
        """Capture a PayPal order."""
        return await self._request(
            "POST",
            f"/v2/checkout/orders/{order_id}/capture",
        )

    async def get_order(self, order_id: str) -> dict:
        """Get PayPal order details."""
        return await self._request("GET", f"/v2/checkout/orders/{order_id}")

    async def get_capture(self, capture_id: str) -> dict:
        """Get capture details."""
        return await self._request("GET", f"/v2/payments/captures/{capture_id}")

    async def refund_capture(
        self,
        capture_id: str,
        amount: str,
        currency: str,
        idempotency_key: str,
        note: str = "Refund via PayPilot AI"
    ) -> dict:
        """Refund a captured payment."""
        return await self._request(
            "POST",
            f"/v2/payments/captures/{capture_id}/refund",
            json={
                "amount": {"value": amount, "currency_code": currency},
                "note_to_payer": note,
            },
            idempotency_key=idempotency_key,
        )

    async def verify_webhook_signature(
        self,
        transmission_id: str,
        transmission_time: str,
        cert_url: str,
        auth_algo: str,
        transmission_sig: str,
        webhook_id: str,
        webhook_body: str,
    ) -> bool:
        """Verify PayPal webhook signature using PayPal's verification endpoint."""
        if not webhook_id:
            # In development without webhook ID, skip verification
            return True

        result = await self._request(
            "POST",
            "/v1/notifications/verify-webhook-signature",
            json={
                "auth_algo": auth_algo,
                "cert_url": cert_url,
                "transmission_id": transmission_id,
                "transmission_sig": transmission_sig,
                "transmission_time": transmission_time,
                "webhook_id": webhook_id,
                "webhook_body": json.loads(webhook_body),
            },
        )
        return result.get("verification_status") == "SUCCESS"