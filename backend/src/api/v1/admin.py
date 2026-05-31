from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import require_role
from src.models.tables import User
from src.repositories.model_repo import ModelVersionRepository
from src.schemas.admin import ModelVersionOut, UserInvite, UserUpdate
from src.schemas.auth import UserOut
from src.services import user_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> list[UserOut]:
    users = await user_service.list_users(db, user.org_id)
    return [UserOut.model_validate(u) for u in users]


@router.post("/users/invite", response_model=UserOut, status_code=201)
async def invite_user(
    body: UserInvite,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> UserOut:
    created = await user_service.invite_user(db, user.org_id, body)
    return UserOut.model_validate(created)


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> UserOut:
    updated = await user_service.update_user(db, user.org_id, user_id, body)
    return UserOut.model_validate(updated)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> Response:
    await user_service.delete_user(db, user.org_id, user_id)
    return Response(status_code=204)


@router.get("/model-versions", response_model=list[ModelVersionOut])
async def list_model_versions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> list[ModelVersionOut]:
    versions = await ModelVersionRepository(db).list_for_org(user.org_id)
    return [ModelVersionOut.model_validate(v) for v in versions]


@router.post("/model-versions/{version_id}/activate", response_model=ModelVersionOut)
async def activate_model_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> ModelVersionOut:
    repo = ModelVersionRepository(db)
    target = await repo.get(version_id)
    from fastapi import HTTPException

    if target is None or target.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="MODEL_VERSION_NOT_FOUND")
    # Deactivate the current active version, activate the target.
    current = await repo.active_for_org(user.org_id)
    if current is not None and current.id != target.id:
        current.is_active = False
    target.is_active = True
    await db.flush()
    return ModelVersionOut.model_validate(target)
