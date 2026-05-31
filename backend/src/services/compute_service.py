"""Chemical screening and process optimization orchestration.

Wraps the pure engines with caching (Redis or in-memory), executor offload, and
persistence to the session's result tables.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.cache import cache
from src.core.executor import run_cpu_bound
from src.engines import ChemicalEngine, InvalidSMILESError, pipeline
from src.models.tables import OptimizationResult, ScreeningResult, Session
from src.repositories.result_repo import (
    OptimizationRepository,
    ScreeningRepository,
)
from src.schemas.chemical import ScreenResponse
from src.schemas.process import OptimizeRequest, OptimizeResponse

_chem_engine = ChemicalEngine()

SCREEN_TTL = 3600
OPTIMIZE_TTL = 300


def _sha(payload: str) -> str:
    return hashlib.sha256(payload.encode()).hexdigest()


async def screen_chemical(
    db: AsyncSession,
    session: Session,
    dye_name: str,
    smiles: str,
    force: bool,
) -> ScreenResponse:
    repo = ScreeningRepository(db)
    existing = await repo.by_session(session.id)
    if existing is not None and not force:
        raise HTTPException(status_code=409, detail="SCREENING_ALREADY_COMPLETE")

    cache_key = f"screening:{_sha(smiles)}"
    cached = await cache.get(cache_key)
    start = datetime.now(timezone.utc)

    if cached:
        data = json.loads(cached)
        compat, solub, descriptors = (
            data["compatibility_score"],
            data["solubility_score"],
            data["descriptors"],
        )
        compute_ms = 0.0
    else:
        try:
            compat, solub, desc_obj = await run_cpu_bound(
                _chem_engine.screen, smiles, dye_name
            )
        except InvalidSMILESError as exc:
            raise HTTPException(status_code=400, detail=f"INVALID_SMILES: {exc.detail}")
        descriptors = desc_obj.model_dump()
        compute_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000
        await cache.set(
            cache_key,
            json.dumps(
                {
                    "compatibility_score": compat,
                    "solubility_score": solub,
                    "descriptors": descriptors,
                }
            ),
            ttl=SCREEN_TTL,
        )

    # Persist (upsert) the screening result on the session.
    if existing is not None:
        existing.dye_name = dye_name
        existing.smiles_string = smiles
        existing.compatibility_score = compat
        existing.solubility_score = solub
        existing.descriptors = descriptors
        existing.compute_time_ms = compute_ms
    else:
        await repo.add(
            ScreeningResult(
                session_id=session.id,
                dye_name=dye_name,
                smiles_string=smiles,
                compatibility_score=compat,
                solubility_score=solub,
                descriptors=descriptors,
                compute_time_ms=compute_ms,
            )
        )
    session.chemical_input = {**descriptors, "compatibility_score": compat, "solubility_score": solub}
    await db.flush()

    return ScreenResponse(
        compatibility_score=compat,
        solubility_score=solub,
        descriptors=descriptors,
        compute_time_ms=round(compute_ms, 1),
        session_id=session.id,
    )


def _canonical(request: OptimizeRequest) -> str:
    return json.dumps(request.model_dump(mode="json"), sort_keys=True)


async def optimize_process(
    db: AsyncSession, session: Session, request: OptimizeRequest
) -> OptimizeResponse:
    cache_key = f"optimize:{_sha(_canonical(request))}"
    cached = await cache.get(cache_key)
    if cached:
        response = OptimizeResponse.model_validate_json(cached)
    else:
        response = await run_cpu_bound(pipeline.run, request)
        await cache.set(cache_key, response.model_dump_json(), ttl=OPTIMIZE_TTL)

    # Persist (upsert) the optimization result + sync session fields.
    repo = OptimizationRepository(db)
    existing = await repo.by_session(session.id)
    payload = dict(
        recommended_parameters=response.recommended_parameters.model_dump(),
        simulation_outputs=response.simulation_outputs.model_dump(),
        sustainability_metrics=response.sustainability_metrics.model_dump(),
        risk_assessment=response.risk_assessment.model_dump(),
        explainability={k: v.model_dump() for k, v in response.explainability.items()},
        model_version_id=response.model_version,
        compute_time_ms=response.compute_time_ms,
    )
    if existing is not None:
        for k, v in payload.items():
            setattr(existing, k, v)
    else:
        await repo.add(OptimizationResult(session_id=session.id, **payload))

    session.optimization_mode = request.optimization_mode.value
    session.fabric_profile = request.fabric_profile.model_dump()
    session.manual_overrides = (
        request.manual_overrides.model_dump() if request.manual_overrides else None
    )
    await db.flush()
    return response


def map_session_id(session_id: UUID) -> UUID:  # small helper for clarity
    return session_id
