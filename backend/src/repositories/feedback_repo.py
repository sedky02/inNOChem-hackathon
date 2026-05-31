from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select

from src.models.enums import RetrainingStatus
from src.models.tables import FeedbackRecord
from src.repositories.base import BaseRepository


class FeedbackRepository(BaseRepository[FeedbackRecord]):
    model = FeedbackRecord

    async def pending_count(self, org_id: UUID) -> int:
        # Pending feedback joined to sessions in this org.
        from src.models.tables import Session

        stmt = (
            select(func.count())
            .select_from(FeedbackRecord)
            .join(Session, Session.id == FeedbackRecord.session_id)
            .where(
                Session.org_id == org_id,
                FeedbackRecord.retrain_status == RetrainingStatus.pending,
            )
        )
        return int((await self.session.execute(stmt)).scalar_one())
