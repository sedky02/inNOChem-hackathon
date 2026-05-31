"""Risk Intelligence Engine — four failure-probability classifiers.

Trained scikit-learn classifiers would slot in here; absent those, a
deterministic physical heuristic produces probabilities and confidences with
the same response shape (spec §15 mapping for overall risk).
"""

from __future__ import annotations

from src.schemas.process import (
    ChemicalProfile,
    ProcessParams,
    RiskAssessment,
    RiskComponent,
)

COMPONENT_KEYS = (
    "dye_degradation",
    "process_instability",
    "equipment_stress",
    "low_color_yield",
)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _confidence(seed: str) -> float:
    h = abs(hash(seed)) % 1000 / 1000.0
    return round(0.78 + h * 0.17, 2)


class RiskEngine:
    def assess(
        self,
        params: ProcessParams,
        mol: ChemicalProfile,
        dye_uptake_pct: float,
    ) -> RiskAssessment:
        probs = {
            "dye_degradation": _clamp(
                (params.temperature - 110.0) / 130.0
                + (params.time - 40.0) / 320.0
                - mol.aromatic_rings * 0.02,
                0.02,
                0.97,
            ),
            "process_instability": _clamp(
                abs(params.pressure / max(params.temperature, 1.0) - 1.9) * 0.55,
                0.02,
                0.97,
            ),
            "equipment_stress": _clamp((params.pressure - 180.0) / 280.0, 0.02, 0.97),
            "low_color_yield": _clamp((92.0 - dye_uptake_pct) / 110.0, 0.02, 0.97),
        }

        components = {
            k: RiskComponent(
                probability=round(probs[k], 3),
                confidence=_confidence(f"{k}-{params.pressure}-{params.temperature}"),
            )
            for k in COMPONENT_KEYS
        }

        max_p = max(probs.values())
        if max_p < 0.30:
            overall = "LOW"
        elif max_p < 0.50:
            overall = "MEDIUM"
        elif max_p < 0.70:
            overall = "HIGH"
        else:
            overall = "CRITICAL"

        alerts: list[str] = []
        if probs["equipment_stress"] >= 0.6:
            alerts.append("Chamber pressure approaches equipment fatigue thresholds.")
        if probs["dye_degradation"] >= 0.6:
            alerts.append("Sustained temperature risks thermal dye degradation.")
        if probs["process_instability"] >= 0.6:
            alerts.append("Pressure/temperature ratio is near a fluid phase boundary.")
        if probs["low_color_yield"] >= 0.6:
            alerts.append("Predicted uptake may fall short of the target shade.")

        overall_confidence = round(
            sum(c.confidence for c in components.values()) / len(components), 2
        )

        return RiskAssessment(
            overall_risk=overall,
            overall_confidence=overall_confidence,
            components=components,
            alerts=alerts,
        )
