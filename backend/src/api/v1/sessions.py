from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_db
from src.core.deps import get_current_user, require_role
from src.models.enums import SessionStatus
from src.models.tables import User
from src.schemas.common import SavedResponse
from src.schemas.session import (
    SessionCreate,
    SessionDetail,
    SessionListResponse,
    SessionOut,
    SessionUpdate,
)
from src.services import export_service, session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionOut:
    session = await session_service.create_session(
        db, user.org_id, user.id, body.session_name
    )
    return SessionOut.model_validate(session)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: SessionStatus | None = None,
    mode: str | None = None,
    search: str | None = None,
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionListResponse:
    return await session_service.list_sessions(
        db,
        user.org_id,
        page=page,
        limit=limit,
        status=status,
        mode=mode,
        search=search,
        order_desc=order == "desc",
    )


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionDetail:
    return await session_service.get_session_detail(db, session_id, user.org_id)


@router.put("/{session_id}", response_model=SavedResponse)
async def update_session(
    session_id: UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SavedResponse:
    session = await session_service.get_owned_session(db, session_id, user.org_id)
    saved_at = await session_service.update_session(
        db, session, body.model_dump(exclude_none=True)
    )
    return SavedResponse(session_id=session_id, saved_at=saved_at)


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> Response:
    session = await session_service.get_owned_session(db, session_id, user.org_id)
    await session_service.soft_delete(db, session)
    return Response(status_code=204)


@router.get("/{session_id}/export")
async def export_session(
    session_id: UUID,
    format: str = Query(..., pattern="^(json|pdf|csv)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("engineer", "admin")),
) -> StreamingResponse:
    session = await session_service.get_owned_session(db, session_id, user.org_id)
    content, content_type, filename = await export_service.build_export(
        db, session, format
    )
    import io

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
