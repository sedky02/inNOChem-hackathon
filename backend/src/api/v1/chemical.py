from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import get_current_user
from src.models.tables import User
from src.schemas.chemical import ScreenRequest, ScreenResponse
from src.services import compute_service, session_service

router = APIRouter(prefix="/chemical", tags=["chemical"])


@router.post("/screen", response_model=ScreenResponse)
async def screen(
    body: ScreenRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScreenResponse:
    if body.session_id is None:
        raise HTTPException(status_code=422, detail="SESSION_ID_REQUIRED")
    session = await session_service.get_owned_session(db, body.session_id, user.org_id)
    return await compute_service.screen_chemical(
        db, session, body.dye_name, body.smiles, body.force
    )
