from uuid import UUID

from pydantic import BaseModel, Field

from src.models.enums import RetrainingStatus


class ExperimentalFeedback(BaseModel):
    actual_ks: float = Field(ge=0, le=50)
    actual_pressure: float
    actual_temperature: float
    actual_flow_rate: float
    notes: str | None = None


class AdaptRequest(BaseModel):
    session_id: UUID
    experimental_feedback: ExperimentalFeedback


class ModelConfidence(BaseModel):
    previous_accuracy: float
    current_accuracy: float
    delta: float
    training_samples_used: int


class AdaptResponse(BaseModel):
    status: str
    feedback_id: UUID
    message: str
    job_id: str | None = None
    # Included inline so clients can show the improvement without polling.
    model_confidence: ModelConfidence


class AdaptStatusResponse(BaseModel):
    feedback_id: UUID
    retrain_status: RetrainingStatus
    model_confidence: ModelConfidence | None = None
