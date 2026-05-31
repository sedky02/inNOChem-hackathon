from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.cache import USING_REDIS, cache
from src.engines.pipeline import pipeline
from src.ml.registry import registry

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
        "param_model": pipeline.optimizer.model_version,
        "ml_models": {
            "ks_regressor": registry.ks_model is not None,
            "thermal_classifier": registry.thermal_model is not None,
            "fixation_classifier": registry.fixation_model is not None,
        },
    }
