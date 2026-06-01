"""Application settings loaded from environment / .env."""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEV_JWT_SECRETS = {"", "dev-secret-change-me", "change-me-in-production"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./greendye.db"

    # Auth / JWT
    jwt_algorithm: str = "HS256"
    jwt_secret: str = "dev-secret-change-me"
    jwt_private_key_path: str | None = None
    jwt_public_key_path: str | None = None
    access_token_ttl_seconds: int = 900
    refresh_token_ttl_seconds: int = 604_800

    # Redis / Celery / S3 (all optional)
    redis_url: str | None = None
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    celery_task_always_eager: bool = False
    s3_bucket_name: str | None = None
    s3_region: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # App
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = ""
    model_base_path: str = "./models/"
    sentry_dsn: str | None = None
    auto_create_tables: bool = True
    seed_on_startup: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"dev", "development", "local", "test"}

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"prod", "production"}

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @property
    def is_sqlite(self) -> bool:
        return self.sqlalchemy_database_url.startswith("sqlite")

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.is_production:
            return self

        if self.jwt_algorithm == "HS256" and self.jwt_secret in DEV_JWT_SECRETS:
            raise ValueError("JWT_SECRET must be set to a strong secret in production")
        if self.is_sqlite:
            raise ValueError("DATABASE_URL must point to PostgreSQL in production")
        if not (self.celery_broker_url or self.redis_url):
            raise ValueError("CELERY_BROKER_URL or REDIS_URL must be set in production")
        if not (self.celery_result_backend or self.redis_url):
            raise ValueError("CELERY_RESULT_BACKEND or REDIS_URL must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
