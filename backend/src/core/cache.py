"""Cache abstraction with two backends.

If REDIS_URL is set and redis is installed, an async Redis client is used.
Otherwise an in-process TTL dictionary is used so the app runs with no Redis.
The same interface backs response caching, the refresh-token store, and the
access-token denylist.
"""

from __future__ import annotations

import time
from typing import Any

from src.config.settings import settings

try:
    import redis.asyncio as aioredis

    REDIS_LIB = True
except Exception:  # pragma: no cover
    REDIS_LIB = False


class _MemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float | None, str]] = {}

    def _expired(self, key: str) -> bool:
        exp = self._store.get(key, (None, ""))[0]
        if exp is not None and exp < time.time():
            self._store.pop(key, None)
            return True
        return False

    async def get(self, key: str) -> str | None:
        if self._expired(key):
            return None
        item = self._store.get(key)
        return item[1] if item else None

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        exp = time.time() + ttl if ttl else None
        self._store[key] = (exp, value)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return (await self.get(key)) is not None


class _RedisCache:  # pragma: no cover - requires Redis
    def __init__(self, url: str) -> None:
        self._client = aioredis.from_url(url, decode_responses=True)

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))


def _build_cache() -> Any:
    if settings.redis_url and REDIS_LIB:
        try:  # pragma: no cover
            return _RedisCache(settings.redis_url)
        except Exception:
            pass
    return _MemoryCache()


cache = _build_cache()
USING_REDIS = isinstance(cache, _RedisCache) if REDIS_LIB else False
