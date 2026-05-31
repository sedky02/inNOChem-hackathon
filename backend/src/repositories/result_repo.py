from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select

from src.models.tables import (
    OptimizationResult,
    ScreeningResult,
    SessionStep,
    VerificationRecord,
)
from src.repositories.base import BaseRepository


class ScreeningRepository(BaseRepository[ScreeningResult]):
    model = ScreeningResult

    async def by_session(self, session_id: UUID) -> ScreeningResult | None:
        result = await self.session.execute(
            select(ScreeningResult).where(ScreeningResult.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def by_sessions(
        self, session_ids: Sequence[UUID]
    ) -> dict[UUID, ScreeningResult]:
        if not session_ids:
            return {}
        result = await self.session.execute(
            select(ScreeningResult).where(ScreeningResult.session_id.in_(session_ids))
        )
        return {r.session_id: r for r in result.scalars().all()}


class OptimizationRepository(BaseRepository[OptimizationResult]):
    model = OptimizationResult

    async def by_session(self, session_id: UUID) -> OptimizationResult | None:
        result = await self.session.execute(
            select(OptimizationResult).where(
                OptimizationResult.session_id == session_id
            )
        )
        return result.scalar_one_or_none()

    async def by_sessions(
        self, session_ids: Sequence[UUID]
    ) -> dict[UUID, OptimizationResult]:
        if not session_ids:
            return {}
        result = await self.session.execute(
            select(OptimizationResult).where(
                OptimizationResult.session_id.in_(session_ids)
            )
        )
        return {r.session_id: r for r in result.scalars().all()}


class VerificationRepository(BaseRepository[VerificationRecord]):
    model = VerificationRecord

    async def by_session(self, session_id: UUID) -> VerificationRecord | None:
        result = await self.session.execute(
            select(VerificationRecord).where(
                VerificationRecord.session_id == session_id
            )
        )
        return result.scalar_one_or_none()


class StepRepository(BaseRepository[SessionStep]):
    model = SessionStep

    async def for_session(self, session_id: UUID) -> list[SessionStep]:
        result = await self.session.execute(
            select(SessionStep)
            .where(SessionStep.session_id == session_id)
            .order_by(SessionStep.step_number)
        )
        return list(result.scalars().all())
