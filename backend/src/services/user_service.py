"""Admin user management."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import hash_password
from src.models.tables import User
from src.repositories.user_repo import UserRepository
from src.schemas.admin import UserInvite, UserUpdate


async def list_users(db: AsyncSession, org_id: UUID) -> list[User]:
    return await UserRepository(db).list_by_org(org_id)


async def invite_user(db: AsyncSession, org_id: UUID, data: UserInvite) -> User:
    repo = UserRepository(db)
    if await repo.by_email(data.email) is not None:
        raise HTTPException(status_code=409, detail="EMAIL_ALREADY_EXISTS")
    temp_password = secrets.token_urlsafe(12)
    user = await repo.add(
        User(
            org_id=org_id,
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            hashed_password=hash_password(temp_password),
            is_active=True,
        )
    )
    # Dispatch invite email (inline no-op if no broker / SMTP configured).
    try:
        from src.jobs.tasks import send_invite_email

        send_invite_email.delay(data.email, temp_password, str(org_id))
    except Exception:
        pass
    return user


async def update_user(
    db: AsyncSession, org_id: UUID, user_id: UUID, data: UserUpdate
) -> User:
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if user is None or user.org_id != org_id or user.deleted_at is not None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.flush()
    return user


async def delete_user(db: AsyncSession, org_id: UUID, user_id: UUID) -> None:
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if user is None or user.org_id != org_id:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    user.deleted_at = datetime.now(timezone.utc)
    await db.flush()
