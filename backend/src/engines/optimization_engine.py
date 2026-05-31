"""Multi-Objective Optimization Engine.

Loads 4 XGBoost regressors (pressure, temperature, time, flow_rate) from
MODEL_BASE_PATH when present. When no model bundle is available — the default
in dev — it falls back to a deterministic thermodynamic baseline (per spec
§6.3), adjusted by chemistry and mode weight vectors.
"""

from __future__ import annotations

from src.config.settings import settings
from src.schemas.process import ChemicalProfile, FabricProfile, ProcessParams

# Mode weight vectors [pressure, temperature, time, flow] (spec §15).
MODE_WEIGHTS: dict[str, list[float]] = {
    "Eco": [1.5, 1.2, 0.7, 0.8],
    "Balanced": [1.0, 1.0, 1.0, 1.0],
    "Performance": [0.7, 0.8, 1.3, 1.2],
}

# Baseline operating point before mode/chemistry adjustment.
BASELINE = ProcessParams(pressure=235.0, temperature=130.0, time=70.0, flow_rate=1.1)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


class OptimizationEngine:
    def __init__(self) -> None:
        self.models = self._try_load_models()
        self.model_version = "xgb-v1.0.0" if self.models else "baseline-thermo-v1.0.0"

    def _try_load_models(self):  # pragma: no cover - depends on environment
        import os

        bundle = os.path.join(settings.model_base_path, "model.joblib")
        if not os.path.exists(bundle):
            return None
        try:
            import joblib

            return joblib.load(bundle)
        except Exception:
            return None

    def predict(
        self,
        mol: ChemicalProfile,
        fabric: FabricProfile,
        mode: str,
    ) -> ProcessParams:
        if self.models is not None:  # pragma: no cover - needs trained model
            return self._predict_ml(mol, fabric, mode)
        return self._predict_baseline(mol, fabric, mode)

    # ── Deterministic thermodynamic baseline ──────────────────
    def _predict_baseline(
        self, mol: ChemicalProfile, fabric: FabricProfile, mode: str
    ) -> ProcessParams:
        w = MODE_WEIGHTS.get(mode, MODE_WEIGHTS["Balanced"])

        # Chemistry shifts: heavier/more-polar molecules need more pressure/heat.
        mw_shift = (mol.molecular_weight - 420.0) / 40.0
        tpsa_shift = mol.tpsa / 60.0
        blend_shift = (fabric.polyester_pct - 50.0) / 50.0  # PET likes higher temp

        pressure = (BASELINE.pressure + mw_shift * 8.0) * _scale(w[0])
        temperature = (BASELINE.temperature + tpsa_shift * 4.0 + blend_shift * 5.0) * _scale(w[1])
        time = (BASELINE.time) * _time_scale(w[2])
        flow = (BASELINE.flow_rate) * _scale(w[3])

        return ProcessParams(
            pressure=_clamp(pressure, 100, 400),
            temperature=_clamp(temperature, 80, 200),
            time=_clamp(time, 20, 150),
            flow_rate=_clamp(flow, 0.3, 2.5),
        )

    def _predict_ml(
        self, mol: ChemicalProfile, fabric: FabricProfile, mode: str
    ) -> ProcessParams:  # pragma: no cover
        import numpy as np

        features = np.array(
            [[
                mol.molecular_weight, mol.logP, mol.tpsa, mol.hbd, mol.hba,
                mol.rotatable_bonds, mol.aromatic_rings, fabric.cotton_pct,
                fabric.density_gm2, fabric.mass_kg, mol.compatibility_score,
            ]]
        )
        w = MODE_WEIGHTS.get(mode, MODE_WEIGHTS["Balanced"])
        preds = {k: float(m.predict(features)[0]) for k, m in self.models.items()}
        return ProcessParams(
            pressure=_clamp(preds["pressure"] * _scale(w[0]), 100, 400),
            temperature=_clamp(preds["temperature"] * _scale(w[1]), 80, 200),
            time=_clamp(preds["time"] * _time_scale(w[2]), 20, 150),
            flow_rate=_clamp(preds["flow_rate"] * _scale(w[3]), 0.3, 2.5),
        )


def _scale(weight: float) -> float:
    """Higher eco weight → lower pressure/temp/flow (greener)."""
    return 1.0 / weight if weight else 1.0


def _time_scale(weight: float) -> float:
    """Higher weight → longer time (eco trades time for gentleness)."""
    return weight
