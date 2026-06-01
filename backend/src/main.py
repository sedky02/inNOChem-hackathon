"""FastAPI application factory for GreenDye Twin."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.router import root_router, v1_router
from src.config.database import init_db
from src.config.settings import settings
from src.engines.errors import InvalidSMILESError


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_tables:
        await init_db()
    if settings.seed_on_startup:
        from src.config.seed import seed_demo_data

        await seed_demo_data()
    yield


def create_app() -> FastAPI:
    if settings.sentry_dsn:  # pragma: no cover
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)
        except Exception:
            pass

    app = FastAPI(
        title="GreenDye Twin API",
        version="1.0.0",
        description="Explainable AI Digital Twin for supercritical CO₂ textile dyeing.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=(
            r"https?://(localhost|127\.0\.0\.1)(:\d+)?" if settings.is_development else None
        ),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    @app.exception_handler(InvalidSMILESError)
    async def _invalid_smiles(_: Request, exc: InvalidSMILESError):
        return JSONResponse(
            status_code=400, content={"detail": f"INVALID_SMILES: {exc.detail}"}
        )

    app.include_router(root_router)
    app.include_router(v1_router)
    return app


app = create_app()
