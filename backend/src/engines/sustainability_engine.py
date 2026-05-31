"""Sustainability Engine — life-cycle comparison vs conventional aqueous dyeing.

Baseline constants are derived from textile LCA literature (spec §6.4).
"""

from __future__ import annotations

from src.schemas.process import ProcessParams, SustainabilityMetrics

CONVENTIONAL_WATER_L_PER_KG = 50.0
CONVENTIONAL_ENERGY_KWH_PER_KG = 4.2
CONVENTIONAL_CO2_KG_PER_KG = 3.8


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


class SustainabilityEngine:
    def calculate(self, params: ProcessParams, mass_kg: float) -> SustainabilityMetrics:
        # scCO₂ energy model: compression + heating, scaled by load.
        sco2_energy_per_kg = (
            0.9
            + (params.pressure - 100.0) / 600.0
            + (params.temperature - 80.0) / 260.0
            + params.flow_rate * 0.25
        )
        energy_reduction_pct = _clamp(
            (1.0 - sco2_energy_per_kg / CONVENTIONAL_ENERGY_KWH_PER_KG) * 100.0,
            0.0,
            95.0,
        )

        sco2_co2_per_kg = 0.4 + sco2_energy_per_kg * 0.35  # near-closed CO₂ loop
        carbon_saved = max(0.0, (CONVENTIONAL_CO2_KG_PER_KG - sco2_co2_per_kg) * mass_kg)

        # E-Factor: waste mass per kg product; closed scCO₂ loop is very low.
        e_factor = _clamp(0.015 + params.flow_rate * 0.02 + params.time / 8000.0, 0.01, 0.2)

        return SustainabilityMetrics(
            water_savings_pct=99.8,  # scCO₂ uses essentially no water
            energy_reduction_pct=round(energy_reduction_pct, 1),
            carbon_saved_kg_co2e=round(carbon_saved, 2),
            e_factor_kg_per_kg=round(e_factor, 3),
        )
