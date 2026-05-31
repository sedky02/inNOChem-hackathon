from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserBrief(ORMModel):
    id: UUID
    full_name: str


class PaginatedMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class MessageResponse(BaseModel):
    message: str


class SavedResponse(BaseModel):
    session_id: UUID
    saved_at: datetime
