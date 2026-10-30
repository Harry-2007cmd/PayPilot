from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import get_current_user, get_current_merchant
from sqlalchemy import text

router = APIRouter(prefix="/api", tags=["config"])

# Template placeholder values shipped in .env.example. A value matching one of
# these means the operator has not yet substituted their own credential.
TEMPLATE_PLACEHOLDERS = {
    "AYCzKH8QrmavaJ2Utdjf4EZFFfSvzBvVv5FyDcNMvmkdc_Zd-SzL8bDor7FHbSb8fD19awlAO1a34u89",  # PAYPAL_CLIENT_ID
    "EC58Y93GYxk3QDtrbgfOe4_BNJXAuv4VBDBip0RzdanlPNJrX9SGj1I0_wLbeFLTlQdvoWouYTrHF3b6",  # PAYPAL_CLIENT_SECRET
    "AQ.Ab8RN6JUx1qljXF9qfLqvNv2lHwNvvm-XgqUbVfx1-tveK4XyA",  # GEMINI_API_KEY
}


def _is_real(value: str) -> bool:
    return bool(value) and value not in TEMPLATE_PLACEHOLDERS


@router.get("/config-status")
async def config_status(
    current_user=Depends(get_current_user),
    current_merchant=Depends(get_current_merchant),
    db=Depends(get_db),
):
    """Honest integration status for the Settings page. Never exposes secrets."""
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "paypal_configured": _is_real(settings.PAYPAL_CLIENT_ID) and _is_real(settings.PAYPAL_CLIENT_SECRET),
        "paypal_base_url": settings.PAYPAL_BASE_URL,
        "paypal_client_id": settings.PAYPAL_CLIENT_ID if _is_real(settings.PAYPAL_CLIENT_ID) else None,
        "ai_configured": _is_real(settings.GEMINI_API_KEY),
        "ai_model": settings.GEMINI_MODEL,
        "database_connected": db_ok,
        "database_url_host": _redact_db_url(settings.DATABASE_URL),
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
    }


def _redact_db_url(url: str) -> str:
    # Show only the scheme + host, never credentials
    if "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    if "@" in rest:
        rest = rest.split("@", 1)[1]
    return f"{scheme}://***@{rest}"