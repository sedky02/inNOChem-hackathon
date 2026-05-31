"""Process Simulation Engine.

Integrates InnoChem's real physics:
  - Equilibrium K/S from the trained RandomForest regressor (when available).
  - Langmuir adsorption kinetics solved as a coupled ODE (PR-EOS CO₂ density
    feeds the rate constants).
Falls back to an Arrhenius/exponential analytic curve when models / SciPy are
absent, preserving the SimulationOutputs contract either way.
"""

from __future__ import annotations

import math

from src.engines.kinetics import solve_dyeing_kinetics
from src.engines.pr_eos import co2_density_celsius_bar
from src.ml.features import build_feature_row
from src.ml.registry import registry
from src.schemas.process import (
    ChemicalProfile,
    FabricProfile,
    KineticPoint,
    ProcessParams,
    SimulationOutputs,
)

CURVE_POINTS = 50


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


class SimulationEngine:
    def simulate(
        self,
        params: ProcessParams,
        mol: ChemicalProfile,
        fabric: FabricProfile,
    ) -> SimulationOutputs:
        sol = mol.solubility_score / 100.0
        density = co2_density_celsius_bar(params.temperature, params.pressure)

        # Equilibrium K/S: trained model if available, else heuristic.
        feature_row = build_feature_row(mol, fabric, params)
        ks_pred = registry.predict_ks(feature_row)
        if ks_pred is not None:
            ks_eq = _clamp(ks_pred, 1.0, 320.0)
        else:
            base_uptake = _clamp(
                55.0 + (params.pressure - 180) / 8 + (params.temperature - 110) / 5
                + params.time / 6 + sol * 12,
                20, 99,
            )
            ks_eq = 8.0 + (base_uptake / 100.0) * 18.0 + sol * 4.0

        # Langmuir kinetics. q is fractional fiber loading (q_max scaled to
        # dye available), C is fluid-phase dye concentration (mg/L).
        c0 = 80.0 + sol * 140.0
        q_max = c0 * 0.85
        k_ads = 1.1e-4 * (density / 700.0) * (params.temperature / 120.0) * (1 + mol.logP / 12.0)
        k_des = 0.001
        times, q_curve, c_curve = solve_dyeing_kinetics(
            k_ads, k_des, q_max, c0, params.time, CURVE_POINTS
        )

        q_final = q_curve[-1] if q_curve else 0.0
        dye_uptake = _clamp((q_final / q_max) * 100.0 if q_max else 0.0, 0, 99.5)

        curve: list[KineticPoint] = []
        for t, q, c in zip(times, q_curve, c_curve):
            frac = (q / q_max) if q_max else 0.0
            curve.append(
                KineticPoint(
                    time_min=round(t, 2),
                    ks_value=round(ks_eq * frac, 3),
                    dye_concentration_mgL=round(max(0.0, c), 2),
                )
            )

        efficiency = _clamp(
            100.0 - params.time / 2.5 + dye_uptake / 4.0 - params.pressure / 40.0,
            30, 99,
        )

        return SimulationOutputs(
            dye_uptake_pct=round(dye_uptake, 1),
            color_intensity_ks=round(ks_eq, 1),
            process_efficiency_pct=round(efficiency, 0),
            kinetic_curve=curve,
        )
