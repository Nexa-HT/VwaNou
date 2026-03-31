import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title=settings.app_name)
logger = logging.getLogger(__name__)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(incidents_router)
app.include_router(zones_router)
app.include_router(certifications_router)
app.include_router(certifications_admin_router)
app.include_router(admin_router)
app.include_router(trusted_router)
