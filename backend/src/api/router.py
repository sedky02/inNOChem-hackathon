from fastapi import APIRouter

from src.api.v1 import (
    admin,
    auth,
    chemical,
    dashboard,
    health,
    model_adapt,
    process,
    sessions,
    verification,
)

# Health lives at the root; everything else under /api/v1.
root_router = APIRouter()
root_router.include_router(health.router)

v1_router = APIRouter(prefix="/api/v1")
for module in (
    auth,
    sessions,
    verification,
    chemical,
    process,
    model_adapt,
    dashboard,
    admin,
):
    v1_router.include_router(module.router)
