from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PayPilot AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    APP_SECRET_KEY: str = Field(default="dev-change-me-in-production", description="Secret key for JWT tokens")

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./paypilot.db",
        description="PostgreSQL URL (production) or SQLite (dev/test)"
    )

    # CORS
    FRONTEND_ORIGIN: str = Field(default="http://localhost:5173")

    # PayPal
    PAYPAL_CLIENT_ID: str = Field(default="")
    PAYPAL_CLIENT_SECRET: str = Field(default="")
    PAYPAL_BASE_URL: str = Field(default="https://api-m.sandbox.paypal.com")
    PAYPAL_WEBHOOK_ID: str = Field(default="")

    # AI / Gemini
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")

    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()