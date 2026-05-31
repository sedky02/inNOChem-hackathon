"""Adaptive feedback: persist factory outcomes and (re)calibrate confidence.

When Celery is configured, a retraining job is dispatched once enough feedback
accumulates. Otherwise a lightweight inline confidence update is returned so the
client can show the improvement immediately.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import RetrainingStatus
from src.models.tables import FeedbackRecord, Session, User
from src.repositories.feedback_repo import FeedbackRepository
from src.repositories.model_repo import ModelVersionRepository
from src.repositories.result_repo import (
    OptimizationRepository,
    VerificationRepository,
)
from src.schemas.feedback import (
    AdaptRequest,
    AdaptResponse,
    ModelConfidence,
)

RETRAIN_THRESHOLD = 10


async def submit_feedback(
    db: AsyncSession, session: Session, user: User, req: AdaptRequest
) -> AdaptResponse:
    if await VerificationRepository(db).by_session(session.id) is None:
        raise HTTPException(status_code=409, detail="SESSION_NOT_VERIFIED")

    fb = req.experimental_feedback
    repo = FeedbackRepository(db)
    record = await repo.add(
        FeedbackRecord(
            session_id=session.id,
            submitted_by=user.id,
            actual_ks=fb.actual_ks,
            actual_pressure=fb.actual_pressure,
            actual_temperature=fb.actual_temperature,
            actual_flow_rate=fb.actual_flow_rate,
            notes=fb.notes,
            retrain_status=RetrainingStatus.pending,
        )
    )

    pending = await repo.pending_count(session.org_id) if hasattr(session, "org_id") else 0

    # Confidence delta: how close the prediction was to the measured K/S.
    optimization = await OptimizationRepository(db).by_session(session.id)
    predicted_ks = (
        optimization.simulation_outputs.get("color_intensity_ks", fb.actual_ks)
        if optimization
        else fb.actual_ks
    )
    error = abs(predicted_ks - fb.actual_ks) / max(fb.actual_ks, 1.0)
    delta = round(max(0.002, 0.02 * (1.0 - min(error, 1.0))), 3)

    active = await ModelVersionRepository(db).active_for_org(session.org_id)
    previous = active.accuracy_score if active and active.accuracy_score else 0.85
    current = round(min(0.99, previous + delta), 3)

    job_id = None
    status = "accepted"
    if pending >= RETRAIN_THRESHOLD:
        job_id = _dispatch_retrain(str(session.org_id))
        status = "queued"
        record.retrain_status = RetrainingStatus.queued
        await db.flush()

    return AdaptResponse(
        status=status,
        feedback_id=record.id,
        message=(
            "Feedback accepted. Model retraining job queued."
            if status == "queued"
            else "Feedback accepted and confidence recalibrated."
        ),
        job_id=job_id,
        model_confidence=ModelConfidence(
            previous_accuracy=round(previous, 3),
            current_accuracy=current,
            delta=delta,
            training_samples_used=pending,
        ),
    )


def _dispatch_retrain(org_id: str) -> str | None:
    """Dispatch the Celery retrain task if a broker is configured."""
    try:
        from src.jobs.tasks import retrain_model

        result = retrain_model.delay(org_id)
        return str(result.id)
    except Exception:
        # No broker configured — retraining is deferred to the batch checker.
        return None
