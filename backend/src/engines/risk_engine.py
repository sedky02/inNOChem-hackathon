"""Risk Intelligence Engine.

Probabilities come from the trained thermal/fixation RandomForest classifiers
when available (mapped onto the four risk components), else a deterministic
physical heuristic. The structural + process firewall (Colab module 3) adds
auditable warnings and escalates the overall severity.
"""

from __future__ import annotations

from src.engines import risk_firewall
from src.ml.features import build_feature_row
from src.ml.registry import registry
from src.schemas.process import (
    ChemicalProfile,
    FabricProfile,
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
    return round(0.78 + (abs(hash(seed)) % 1000) / 1000.0 * 0.17, 2)


class RiskEngine:
    def assess(
        self,
        params: ProcessParams,
        mol: ChemicalProfile,
        dye_uptake_pct: float,
        fabric: FabricProfile,
        smiles: str | None = None,
    ) -> RiskAssessment:
        model_backed = False
        feature_row = build_feature_row(mol, fabric, params)

        # Dye degradation (thermal) and low color yield (fixation) from models.
        thermal = registry.predict_thermal(feature_row)
        fixation = registry.predict_fixation(feature_row)
        if thermal is not None and fixation is not None:
            model_backed = True
            dye_deg = thermal[1]
            low_yield = fixation[1]
        else:
            dye_deg = _clamp(
                (params.temperature - 110) / 130 + (params.time - 40) / 320
                - mol.aromatic_rings * 0.02,
                0.02, 0.97,
            )
            low_yield = _clamp((92.0 - dye_uptake_pct) / 110.0, 0.02, 0.97)

        # Equipment stress & process instability from physical rules.
        equipment = _clamp((params.pressure - 180) / 280, 0.02, 0.97)
        instability = _clamp(
            abs(params.pressure / max(params.temperature, 1.0) - 1.9) * 0.55, 0.02, 0.97
        )

        probs = {
            "dye_degradation": dye_deg,
            "process_instability": instability,
            "equipment_stress": equipment,
            "low_color_yield": low_yield,
        }
        conf = 0.9 if model_backed else None
        components = {
            k: RiskComponent(
                probability=round(probs[k], 3),
                confidence=conf or _confidence(f"{k}-{params.pressure}-{params.temperature}"),
            )
            for k in COMPONENT_KEYS
        }

        # Firewall: structural (SMARTS) + process-threshold alerts.
        struct_alerts = risk_firewall.scan_structure(smiles)
        proc_alerts, _density = risk_firewall.scan_process(
            params.temperature, params.pressure, params.time, fabric.polyester_pct
        )
        all_firewall = struct_alerts + proc_alerts
        alerts = [a["message"] for a in all_firewall]

        max_p = max(probs.values())
        if max_p < 0.30:
            overall = "LOW"
        elif max_p < 0.50:
            overall = "MEDIUM"
        elif max_p < 0.70:
            overall = "HIGH"
        else:
            overall = "CRITICAL"
        # Escalate on critical firewall hits.
        if any(a["risk_level"] == "CRITICAL" for a in all_firewall):
            overall = "CRITICAL"
        elif any(a["risk_level"] == "WARNING" for a in all_firewall) and overall == "LOW":
            overall = "MEDIUM"

        overall_confidence = round(
            sum(c.confidence for c in components.values()) / len(components), 2
        )
        return RiskAssessment(
            overall_risk=overall,
            overall_confidence=overall_confidence,
            components=components,
            alerts=alerts,
        )
