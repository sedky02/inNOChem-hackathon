"""Session orchestration: CRUD, list assembly, and detail hydration."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import SessionStatus
from src.models.tables import OptimizationResult, ScreeningResult, Session, User
from src.repositories.result_repo import (
    OptimizationRepository,
    ScreeningRepository,
    VerificationRepository,
)
from src.repositories.session_repo import SessionRepository
from src.repositories.user_repo import UserRepository
from src.schemas.common import UserBrief
from src.schemas.session import (
    SessionDetail,
    SessionListItem,
    SessionListResponse,
)


async def create_session(
    db: AsyncSession, org_id: UUID, created_by: UUID, name: str
) -> Session:
    session = Session(
        org_id=org_id,
        created_by=created_by,
        session_name=name,
        status=SessionStatus.in_progress,
    )
    return await SessionRepository(db).add(session)


async def get_owned_session(
    db: AsyncSession, session_id: UUID, org_id: UUID
) -> Session:
    session = await SessionRepository(db).get_active(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
    if session.org_id != org_id:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    return session


def _current_step(
    screening: ScreeningResult | None,
    optimization: OptimizationResult | None,
    verified: bool,
) -> int:
    if verified:
        return 5
    if optimization is not None:
        return 4
    if screening is not None:
        return 2
    return 1


def _screening_dict(s: ScreeningResult | None) -> dict | None:
    if s is None:
        return None
    return {
        "compatibility_score": s.compatibility_score,
        "solubility_score": s.solubility_score,
        "descriptors": s.descriptors,
        "dye_name": s.dye_name,
        "smiles": s.smiles_string,
    }


def _optimization_dict(o: OptimizationResult | None) -> dict | None:
    if o is None:
        return None
    return {
        "recommended_parameters": o.recommended_parameters,
        "simulation_outputs": o.simulation_outputs,
        "sustainability_metrics": o.sustainability_metrics,
        "risk_assessment": o.risk_assessment,
        "explainability": o.explainability,
        "model_version": o.model_version_id,
    }


async def get_session_detail(
    db: AsyncSession, session_id: UUID, org_id: UUID
) -> SessionDetail:
    session = await get_owned_session(db, session_id, org_id)
    screening = await ScreeningRepository(db).by_session(session_id)
    optimization = await OptimizationRepository(db).by_session(session_id)
    verification = await VerificationRepository(db).by_session(session_id)

    return SessionDetail(
        session_id=session.id,
        status=session.status,
        current_step=_current_step(screening, optimization, verification is not None),
        fabric_profile=session.fabric_profile or {},
        chemical_input=session.chemical_input or {},
        optimization_mode=session.optimization_mode,
        manual_overrides=session.manual_overrides,
        screening_result=_screening_dict(screening),
        optimization_result=_optimization_dict(optimization),
        verification_record=(
            {
                "acknowledged": verification.acknowledged,
                "verification_hash": verification.verification_hash,
                "verified_at": verification.verified_at.isoformat(),
                "overall_risk_at_sign": verification.overall_risk_at_sign.value,
            }
            if verification
            else None
        ),
    )


async def list_sessions(
    db: AsyncSession,
    org_id: UUID,
    *,
    page: int,
    limit: int,
    status: SessionStatus | None,
    mode: str | None,
    search: str | None,
    order_desc: bool,
) -> SessionListResponse:
    repo = SessionRepository(db)
    offset = (page - 1) * limit
    sessions, total = await repo.list_filtered(
        org_id,
        status=status,
        mode=mode,
        search=search,
        limit=limit,
        offset=offset,
        order_desc=order_desc,
    )
    ids = [s.id for s in sessions]
    screenings = await ScreeningRepository(db).by_sessions(ids)
    optimizations = await OptimizationRepository(db).by_sessions(ids)

    user_repo = UserRepository(db)
    user_cache: dict[UUID, User | None] = {}

    items: list[SessionListItem] = []
    for s in sessions:
        screening = screenings.get(s.id)
        optimization = optimizations.get(s.id)
        if s.created_by not in user_cache:
            user_cache[s.created_by] = await user_repo.get(s.created_by)
        creator = user_cache[s.created_by]
        risk = None
        if optimization is not None:
            risk = optimization.risk_assessment.get("overall_risk")
        items.append(
            SessionListItem(
                session_id=s.id,
                session_name=s.session_name,
                status=s.status,
                optimization_mode=s.optimization_mode,
                dye_name=screening.dye_name if screening else None,
                compatibility_score=screening.compatibility_score if screening else None,
                overall_risk=risk,
                created_by=(
                    UserBrief(id=creator.id, full_name=creator.full_name)
                    if creator
                    else None
                ),
                created_at=s.created_at,
                completed_at=s.completed_at,
            )
        )

    return SessionListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=max(1, math.ceil(total / limit)) if total else 0,
    )


async def update_session(
    db: AsyncSession, session: Session, patch: dict
) -> datetime:
    for field in ("fabric_profile", "chemical_input", "optimization_mode", "manual_overrides"):
        if patch.get(field) is not None:
            setattr(session, field, patch[field])
    await db.flush()
    return datetime.now(timezone.utc)


async def soft_delete(db: AsyncSession, session: Session) -> None:
    session.deleted_at = datetime.now(timezone.utc)
    await db.flush()
