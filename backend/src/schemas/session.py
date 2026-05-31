from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.enums import SessionStatus
from src.schemas.common import ORMModel, PaginatedMeta, UserBrief


class SessionCreate(BaseModel):
    session_name: str = Field(min_length=1, max_length=255)


class SessionOut(ORMModel):
    session_id: UUID = Field(validation_alias="id", serialization_alias="session_id")
    session_name: str
    status: SessionStatus
    created_at: datetime

    model_config = {"populate_by_name": True, "from_attributes": True}


class SessionListItem(BaseModel):
    session_id: UUID
    session_name: str
    status: SessionStatus
    optimization_mode: str | None
    dye_name: str | None
    compatibility_score: int | None
    overall_risk: str | None
    created_by: UserBrief | None
    created_at: datetime
    completed_at: datetime | None


class SessionListResponse(PaginatedMeta):
    items: list[SessionListItem]


class SessionUpdate(BaseModel):
    fabric_profile: dict | None = None
    chemical_input: dict | None = None
    optimization_mode: str | None = None
    manual_overrides: dict | None = None


class SessionDetail(BaseModel):
    session_id: UUID
    status: SessionStatus
    current_step: int
    fabric_profile: dict
    chemical_input: dict
    optimization_mode: str | None
    manual_overrides: dict | None
    screening_result: dict | None
    optimization_result: dict | None
    verification_record: dict | None
