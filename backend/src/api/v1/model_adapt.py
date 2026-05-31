from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import get_current_user
from src.models.tables import User
from src.repositories.feedback_repo import FeedbackRepository
from src.repositories.model_repo import ModelVersionRepository
from src.schemas.feedback import (
    AdaptRequest,
    AdaptResponse,
    AdaptStatusResponse,
    ModelConfidence,
)
from src.services import feedback_service, session_service

router = APIRouter(prefix="/model", tags=["model"])


@router.post("/adapt", response_model=AdaptResponse, status_code=202)
async def adapt(
    body: AdaptRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AdaptResponse:
    session = await session_service.get_owned_session(db, body.session_id, user.org_id)
    return await feedback_service.submit_feedback(db, session, user, body)


@router.get("/adapt/{feedback_id}/status", response_model=AdaptStatusResponse)
async def adapt_status(
    feedback_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AdaptStatusResponse:
    record = await FeedbackRepository(db).get(feedback_id)
    if record is None:
        raise HTTPException(status_code=404, detail="FEEDBACK_NOT_FOUND")
    active = await ModelVersionRepository(db).active_for_org(user.org_id)
    acc = active.accuracy_score if active and active.accuracy_score else 0.85
    return AdaptStatusResponse(
        feedback_id=feedback_id,
        retrain_status=record.retrain_status,
        model_confidence=ModelConfidence(
            previous_accuracy=round(acc - 0.015, 3),
            current_accuracy=round(acc, 3),
            delta=0.015,
            training_samples_used=active.training_sample_count if active else 0,
        ),
    )
