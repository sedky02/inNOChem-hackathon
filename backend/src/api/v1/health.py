from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.cache import USING_REDIS, cache
from src.engines.pipeline import pipeline

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    cache_ok = True
    try:
        await cache.set("health:ping", "1", ttl=5)
        cache_ok = (await cache.get("health:ping")) == "1"
    except Exception:
        cache_ok = False

    return {
        "status": "ok" if db_ok and cache_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "cache": ("redis" if USING_REDIS else "memory") if cache_ok else "error",
        "model": pipeline.optimizer.model_version,
    }
