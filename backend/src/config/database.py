"""Async SQLAlchemy engine, session factory, and declarative base.

Uses portable column types so the same models run on SQLite (zero-setup local
dev) and PostgreSQL (production) without change.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.config.settings import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    # SQLite needs this for use across the asyncio thread pool.
    connect_args={"check_same_thread": False} if settings.is_sqlite else {},
)

SessionFactory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a transactional session."""
    async with SessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create tables (dev convenience; production uses Alembic migrations)."""
    # Import models so they register on Base.metadata before create_all.
    from src import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
