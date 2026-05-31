from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from src.models.tables import ModelVersion
from src.repositories.base import BaseRepository


class ModelVersionRepository(BaseRepository[ModelVersion]):
    model = ModelVersion

    async def active_for_org(self, org_id: UUID) -> ModelVersion | None:
        result = await self.session.execute(
            select(ModelVersion).where(
                ModelVersion.org_id == org_id, ModelVersion.is_active.is_(True)
            )
        )
        return result.scalar_one_or_none()

    async def list_for_org(self, org_id: UUID) -> list[ModelVersion]:
        result = await self.session.execute(
            select(ModelVersion)
            .where(ModelVersion.org_id == org_id)
            .order_by(ModelVersion.trained_at.desc())
        )
        return list(result.scalars().all())
