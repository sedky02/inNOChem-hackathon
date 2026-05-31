"""Process Simulation Engine.

Physics-flavored empirical model of scCO₂ dye uptake. Uses an Arrhenius-style
rate constant and a Chrastil-style equilibrium solubility, producing a
pseudo-first-order uptake curve. NumPy is used when available for the time grid;
a pure-Python fallback keeps the engine dependency-free.
"""

from __future__ import annotations

import math

from src.schemas.process import (
    ChemicalProfile,
    FabricProfile,
    KineticPoint,
    ProcessParams,
    SimulationOutputs,
)

try:
    import numpy as np

    NUMPY_AVAILABLE = True
except Exception:  # pragma: no cover
    NUMPY_AVAILABLE = False

CURVE_POINTS = 50


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _linspace(stop: float, n: int) -> list[float]:
    if stop <= 0:
        return [0.0] * n
    if NUMPY_AVAILABLE:
        return [float(x) for x in np.linspace(0.0, stop, n)]
    step = stop / (n - 1)
    return [i * step for i in range(n)]


class SimulationEngine:
    def simulate(
        self,
        params: ProcessParams,
        mol: ChemicalProfile,
        fabric: FabricProfile,
    ) -> SimulationOutputs:
        sol = mol.solubility_score / 100.0

        dye_uptake = _clamp(
            55.0
            + (params.pressure - 180.0) / 8.0
            + (params.temperature - 110.0) / 5.0
            + params.time / 6.0
            + sol * 12.0
            - (fabric.density_gm2 - 180.0) / 200.0,
            20.0,
            99.0,
        )
        ks_eq = 8.0 + (dye_uptake / 100.0) * 18.0 + sol * 4.0
        efficiency = _clamp(
            100.0 - params.time / 2.5 + dye_uptake / 4.0 - params.pressure / 40.0,
            30.0,
            99.0,
        )

        # Arrhenius-style uptake rate (per minute) and dye depletion rate.
        k_uptake = 0.02 + (params.temperature - 80.0) / 4000.0 + (params.pressure - 100.0) / 9000.0
        k_decay = 0.012 + params.flow_rate / 200.0
        c0 = 250.0 + sol * 300.0  # mg/L initial dye concentration in scCO₂

        curve: list[KineticPoint] = []
        for t in _linspace(params.time, CURVE_POINTS):
            ks = ks_eq * (1.0 - math.exp(-k_uptake * t))
            conc = c0 * math.exp(-k_decay * t)
            curve.append(
                KineticPoint(
                    time_min=round(t, 2),
                    ks_value=round(ks, 3),
                    dye_concentration_mgL=round(conc, 2),
                )
            )

        return SimulationOutputs(
            dye_uptake_pct=round(dye_uptake, 1),
            color_intensity_ks=round(ks_eq, 1),
            process_efficiency_pct=round(efficiency, 0),
            kinetic_curve=curve,
        )
