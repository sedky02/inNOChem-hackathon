from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from src.models.enums import RiskLevel
from src.schemas.common import UserBrief


class VerifyRequest(BaseModel):
    acknowledged: bool
    engineer_notes: str | None = None
    overall_risk_at_sign: RiskLevel
    force_override: bool = False


class VerifyResponse(BaseModel):
    verification_id: UUID
    session_id: UUID
    verified_by: UserBrief
    verification_hash: str
    verified_at: datetime
