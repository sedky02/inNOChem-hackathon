"""Authentication service: login, refresh, logout."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.core.cache import cache
from src.core.security import (
    create_access_token,
    hash_token,
    new_refresh_token,
    verify_password,
)
from src.repositories.user_repo import UserRepository
from src.schemas.auth import TokenResponse, UserOut


async def login(db: AsyncSession, email: str, password: str) -> TokenResponse:
    repo = UserRepository(db)
    user = await repo.by_email(email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")
    if not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=403, detail="ACCOUNT_INACTIVE")

    access, _jti = create_access_token(str(user.id), str(user.org_id), user.role.value)
    refresh = new_refresh_token()
    await cache.set(
        f"refresh:{hash_token(refresh)}",
        str(user.id),
        ttl=settings.refresh_token_ttl_seconds,
    )
    user.last_login_at = datetime.now(timezone.utc)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_ttl_seconds,
        user=UserOut.model_validate(user),
    )


async def refresh_access(db: AsyncSession, refresh_token: str) -> tuple[str, int]:
    user_id = await cache.get(f"refresh:{hash_token(refresh_token)}")
    if user_id is None:
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")

    from uuid import UUID

    user = await UserRepository(db).get(UUID(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="USER_INACTIVE")

    access, _ = create_access_token(str(user.id), str(user.org_id), user.role.value)
    return access, settings.access_token_ttl_seconds


async def logout(jti: str | None, exp: int | None, refresh_token: str | None) -> None:
    if jti:
        ttl = max(1, (exp or 0) - int(datetime.now(timezone.utc).timestamp()))
        await cache.set(f"denylist:access:{jti}", "1", ttl=ttl)
    if refresh_token:
        await cache.delete(f"refresh:{hash_token(refresh_token)}")
