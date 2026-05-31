"""Application settings loaded from environment / .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    s3_bucket_name: str | None = None
    s3_region: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # App
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:3137"
    model_base_path: str = "./models/"
    sentry_dsn: str | None = None
    seed_on_startup: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
