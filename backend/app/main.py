import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.db.database import init_db
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.certifications import admin_router as certifications_admin_router
from app.routers.certifications import router as certifications_router
from app.routers.incidents import router as incidents_router
from app.routers.trusted import router as trusted_router
from app.routers.users import router as users_router
from app.routers.zones import router as zones_router

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)
logger = logging.getLogger(__name__)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

if settings.app_env.lower() != "production":
    # Local origins are convenient in development, but should not be auto-allowed in production.
    local_dev_origins = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    origins = list(dict.fromkeys([*origins, *local_dev_origins]))

allow_credentials = "*" not in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    if settings.app_env.lower() == "production":
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    return response

@app.on_event("startup")
def on_startup() -> None:
    # In production, run Alembic migrations before startup instead of create_all.
    try:
        init_db()
        app.state.db_ready = True
    except OperationalError as exc:
        app.state.db_ready = False
        logger.warning("Database is unavailable at startup: %s", exc)


@app.get("/health")
async def healthcheck() -> dict:
    return {
        "status": "ok",
        "service": "vwanou-backend",
        "database": "ready" if getattr(app.state, "db_ready", False) else "unavailable",
    }


@app.exception_handler(OperationalError)
async def handle_db_operational_error(_, __: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "Database is currently unavailable. Please try again in a moment."},
    )


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(incidents_router)
app.include_router(zones_router)
app.include_router(certifications_router)
app.include_router(certifications_admin_router)
app.include_router(admin_router)
app.include_router(trusted_router)
