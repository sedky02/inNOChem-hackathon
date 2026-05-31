from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import get_current_user
from src.models.tables import User
from src.schemas.process import OptimizeRequest, OptimizeResponse
from src.services import compute_service, session_service

router = APIRouter(prefix="/process", tags=["process"])


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(
    body: OptimizeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OptimizeResponse:
    session = await session_service.get_owned_session(db, body.session_id, user.org_id)
    return await compute_service.optimize_process(db, session, body)
