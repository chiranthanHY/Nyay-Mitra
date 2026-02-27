"""
main.py — NyayMitra FastAPI application entry point
"""
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes.whatsapp import router as whatsapp_router
from app.routes.rights_card_routes import router as rights_card_router

# ── Logging setup ─────────────────────────────────────────────────────────────
def setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


# ── Lifespan (startup/shutdown) ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    logger.info("🚀 NyayMitra backend starting up...")
    logger.info("  Environment  : %s", settings.app_env)
    logger.info("  AWS Region   : %s", settings.aws_region)
    logger.info("  Bedrock Model: %s", settings.bedrock_model_id)
    logger.info("  AWS Creds    : %s", "✅ Configured" if settings.aws_configured else "⚠️  Not set (mock mode)")
    logger.info("  Twilio       : %s", "✅ Configured" if settings.twilio_configured else "⚠️  Not set")

    yield  # Application runs here

    logger.info("🛑 NyayMitra backend shutting down...")


# ── FastAPI app ───────────────────────────────────────────────────────────────
settings = get_settings()

app = FastAPI(
    title="NyayMitra API",
    description=(
        "NyayMitra — WhatsApp-based AI legal helper for India. "
        "Provides hyperlocal, multilingual legal advice powered by AWS Bedrock (Claude 3.5 Sonnet)."
    ),
    version="1.0.0",
    contact={
        "name": "NyayMitra Team",
        "url": "https://github.com/chiranthanHY/Nyay-Mitra",
    },
    license_info={
        "name": "MIT",
    },
    openapi_tags=[
        {"name": "WhatsApp", "description": "Twilio webhook and chat endpoints"},
        {"name": "Health", "description": "Service health and status"},
    ],
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(whatsapp_router, prefix="/api", tags=["WhatsApp"])
app.include_router(rights_card_router, prefix="/api", tags=["Rights Card"])


# ── Root endpoint ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root() -> JSONResponse:
    return JSONResponse({
        "service": "NyayMitra API",
        "version": "1.0.0",
        "tagline": "न्याय मित्र — Your AI Legal Companion for India",
        "status": "running",
        "endpoints": {
            "whatsapp_webhook": "/api/whatsapp",
            "chat_api": "/api/chat",
            "health": "/api/health",
            "docs": "/docs",
        },
    })


# ── Entry point for direct execution ─────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
