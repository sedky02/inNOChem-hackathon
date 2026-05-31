"""Human-in-the-loop governance: seal a session after engineer sign-off."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import compute_verification_hash
from src.models.enums import SessionStatus
from src.models.tables import Session, User, VerificationRecord
from src.repositories.result_repo import (
    OptimizationRepository,
    VerificationRepository,
)
from src.schemas.common import UserBrief
from src.schemas.verification import VerifyRequest, VerifyResponse


async def verify_session(
    db: AsyncSession, session: Session, user: User, req: VerifyRequest
) -> VerifyResponse:
    if not req.acknowledged:
        raise HTTPException(status_code=400, detail="NOT_ACKNOWLEDGED")

    optimization = await OptimizationRepository(db).by_session(session.id)
    if optimization is None:
        raise HTTPException(status_code=409, detail="OPTIMIZATION_REQUIRED")

    vrepo = VerificationRepository(db)
    if await vrepo.by_session(session.id) is not None:
        raise HTTPException(status_code=409, detail="ALREADY_VERIFIED")

    if req.overall_risk_at_sign.value == "CRITICAL":
        if not (req.force_override and user.role.value == "admin"):
            raise HTTPException(status_code=409, detail="RISK_CRITICAL_REQUIRES_OVERRIDE")

    now = datetime.now(timezone.utc)
    v_hash = compute_verification_hash(
        str(session.id),
        optimization.recommended_parameters,
        str(user.id),
        now.isoformat(),
    )
    record = await vrepo.add(
        VerificationRecord(
            session_id=session.id,
            verified_by=user.id,
            acknowledged=True,
            engineer_notes=req.engineer_notes,
            verification_hash=v_hash,
            overall_risk_at_sign=req.overall_risk_at_sign,
            verified_at=now,
        )
    )
    session.status = SessionStatus.complete
    session.completed_at = now
    await db.flush()

    return VerifyResponse(
        verification_id=record.id,
        session_id=session.id,
        verified_by=UserBrief(id=user.id, full_name=user.full_name),
        verification_hash=v_hash,
        verified_at=now,
    )
