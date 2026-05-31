from fastapi import APIRouter, Depends, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import bearer_scheme
from src.core.security import decode_access_token
from src.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
)
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    return await auth_service.login(db, body.email, body.password)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    body: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> RefreshResponse:
    access, expires_in = await auth_service.refresh_access(db, body.refresh_token)
    return RefreshResponse(access_token=access, expires_in=expires_in)


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Response:
    jti = exp = None
    if credentials is not None:
        try:
            payload = decode_access_token(credentials.credentials)
            jti, exp = payload.get("jti"), payload.get("exp")
        except ValueError:
            pass
    await auth_service.logout(jti, exp, body.refresh_token if body else None)
    return Response(status_code=204)
