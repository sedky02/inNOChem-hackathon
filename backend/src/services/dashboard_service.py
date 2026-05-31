"""Dashboard aggregate metrics (cached)."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.cache import cache
from src.models.enums import SessionStatus
from src.models.tables import OptimizationResult, Session
from src.schemas.dashboard import DashboardAggregate

CONVENTIONAL_WATER_L_PER_KG = 50.0
AGG_TTL = 120


async def aggregate(db: AsyncSession, org_id: UUID) -> DashboardAggregate:
    key = f"dashboard:agg:{org_id}"
    cached = await cache.get(key)
    if cached:
        return DashboardAggregate.model_validate_json(cached)

    sessions = list(
        (
            await db.execute(
                select(Session).where(
                    Session.org_id == org_id, Session.deleted_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    )
    optimizations = {
        o.session_id: o
        for o in (
            await db.execute(
                select(OptimizationResult).where(
                    OptimizationResult.session_id.in_([s.id for s in sessions])
                )
            )
        )
        .scalars()
        .all()
    }

    now = datetime.now(timezone.utc)
    completed = [s for s in sessions if s.status == SessionStatus.complete]
    total_water = 0.0
    total_carbon = 0.0
    energy_vals: list[float] = []
    mode_counter: Counter[str] = Counter()
    this_month = 0

    for s in sessions:
        if s.optimization_mode:
            mode_counter[s.optimization_mode] += 1
        if s.created_at and s.created_at.year == now.year and s.created_at.month == now.month:
            this_month += 1
        opt = optimizations.get(s.id)
        if opt:
            mass = float((s.fabric_profile or {}).get("mass_kg", 0) or 0)
            total_water += mass * CONVENTIONAL_WATER_L_PER_KG
            sm = opt.sustainability_metrics or {}
            total_carbon += float(sm.get("carbon_saved_kg_co2e", 0) or 0)
            if sm.get("energy_reduction_pct") is not None:
                energy_vals.append(float(sm["energy_reduction_pct"]))

    result = DashboardAggregate(
        total_sessions=len(sessions),
        completed_sessions=len(completed),
        total_water_saved_liters=round(total_water, 1),
        total_carbon_saved_kg_co2e=round(total_carbon, 2),
        average_energy_reduction_pct=round(sum(energy_vals) / len(energy_vals), 1)
        if energy_vals
        else 0.0,
        sessions_this_month=this_month,
        most_used_mode=mode_counter.most_common(1)[0][0] if mode_counter else None,
    )
    await cache.set(key, result.model_dump_json(), ttl=AGG_TTL)
    return result
