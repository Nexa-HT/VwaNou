import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _as_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "VwaNou API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres@127.0.0.1:5432/vwanou",
    )
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    enable_docs: bool = _as_bool(
        os.getenv("ENABLE_DOCS"),
        default=os.getenv("APP_ENV", "development").lower() != "production",
    )

    def __post_init__(self) -> None:
        if self.app_env.lower() != "production":
            return

        weak_secrets = {"", "change-me", "your-super-secret-key-change-this-in-production"}
        if self.jwt_secret_key.strip() in weak_secrets or len(self.jwt_secret_key) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters and not use default values in production."
            )

        origin_values = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if "*" in origin_values:
            raise ValueError("CORS_ORIGINS cannot include '*' in production.")


settings = Settings()
