from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import get_current_user
from src.models.tables import User
from src.schemas.dashboard import DashboardAggregate
from src.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/aggregate", response_model=DashboardAggregate)
async def aggregate(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardAggregate:
    return await dashboard_service.aggregate(db, user.org_id)
