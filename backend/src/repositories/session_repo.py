from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select

from src.models.enums import SessionStatus
from src.models.tables import ScreeningResult, Session
from src.repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    model = Session

    async def get_active(self, id_: UUID) -> Session | None:
        s = await self.session.get(Session, id_)
        return s if s and s.deleted_at is None else None

    async def list_filtered(
        self,
        org_id: UUID,
        *,
        status: SessionStatus | None = None,
        mode: str | None = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
        order_desc: bool = True,
    ) -> tuple[list[Session], int]:
        conditions = [Session.org_id == org_id, Session.deleted_at.is_(None)]
        if status is not None:
            conditions.append(Session.status == status)
        if mode is not None:
            conditions.append(Session.optimization_mode == mode)

        stmt = select(Session).where(*conditions)
        if search:
            like = f"%{search.lower()}%"
            # Match session name, or the dye name on the joined screening result.
            sub = select(ScreeningResult.session_id).where(
                func.lower(ScreeningResult.dye_name).like(like)
            )
            stmt = stmt.where(
                or_(func.lower(Session.session_name).like(like), Session.id.in_(sub))
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        order_col = Session.created_at.desc() if order_desc else Session.created_at.asc()
        stmt = stmt.order_by(order_col).limit(limit).offset(offset)
        rows = (await self.session.execute(stmt)).scalars().all()
        return list(rows), int(total)

    async def count_by_org(self, org_id: UUID) -> int:
        stmt = select(func.count()).select_from(Session).where(
            Session.org_id == org_id, Session.deleted_at.is_(None)
        )
        return int((await self.session.execute(stmt)).scalar_one())
