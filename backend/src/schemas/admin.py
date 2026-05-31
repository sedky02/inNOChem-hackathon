from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from src.models.enums import UserRole
from src.schemas.common import ORMModel


class UserInvite(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.operator
    full_name: str = Field(min_length=1, max_length=255)


class UserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None


class ModelVersionOut(ORMModel):
    id: UUID
    version_tag: str
    accuracy_score: float | None
    training_sample_count: int
    is_active: bool
    trained_at: datetime
