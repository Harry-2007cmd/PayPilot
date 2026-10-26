from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api import auth, orders, paypal, payments, webhooks, investigations, actions, imports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}

# Include routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(paypal.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
app.include_router(investigations.router)
app.include_router(actions.router)
app.include_router(imports.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)