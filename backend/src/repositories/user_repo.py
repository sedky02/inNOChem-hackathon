from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select

from src.models.tables import User
from src.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(
                func.lower(User.email) == email.lower(), User.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list_by_org(
        self, org_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[User]:
        result = await self.session.execute(
            select(User)
            .where(User.org_id == org_id, User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
