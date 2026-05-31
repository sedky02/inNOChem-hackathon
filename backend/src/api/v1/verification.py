from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import require_role
from src.models.tables import User
from src.schemas.verification import VerifyRequest, VerifyResponse
from src.services import session_service, verification_service

router = APIRouter(prefix="/sessions", tags=["verification"])


@router.post("/{session_id}/verify", response_model=VerifyResponse)
async def verify(
    session_id: UUID,
    body: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("engineer", "admin")),
) -> VerifyResponse:
    session = await session_service.get_owned_session(db, session_id, user.org_id)
    return await verification_service.verify_session(db, session, user, body)
