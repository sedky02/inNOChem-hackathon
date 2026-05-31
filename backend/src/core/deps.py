"""FastAPI dependencies: authenticated user resolution and RBAC."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.cache import cache
from src.core.security import decode_access_token
from src.models.tables import User
from src.repositories.user_repo import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="NOT_AUTHENTICATED")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="TOKEN_INVALID")

    jti = payload.get("jti")
    if jti and await cache.exists(f"denylist:access:{jti}"):
        raise HTTPException(status_code=401, detail="TOKEN_REVOKED")

    user = await UserRepository(db).get(UUID(payload["sub"]))
    if user is None or user.deleted_at is not None or not user.is_active:
        raise HTTPException(status_code=401, detail="USER_INACTIVE")
    return user


def require_role(*roles: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="INSUFFICIENT_ROLE"
            )
        return user

    return dependency
