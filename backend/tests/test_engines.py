"""Unit tests for the pure computation engines (no DB / HTTP)."""

import pytest

from src.engines.chemical_engine import ChemicalEngine
from src.engines.errors import InvalidSMILESError
from src.engines.pipeline import EnginePipeline
from src.schemas.process import (
    ChemicalProfile,
    FabricProfile,
    OptimizeRequest,
)

CHEM = ChemicalEngine()


def test_screen_valid_smiles_returns_bounded_scores():
    compat, solub, desc = CHEM.screen("O=C1c2ccccc2C(=O)c2ccccc21", "Anthraquinone")
    assert 0 <= compat <= 100
    assert 0 <= solub <= 100
    assert desc.molecular_weight > 0
    assert desc.aromatic_rings >= 1


def test_screen_empty_smiles_raises():
    with pytest.raises(InvalidSMILESError):
        CHEM.screen("   ", "empty")


def test_screen_is_deterministic():
    a = CHEM.screen("c1ccccc1", "benzene")
    b = CHEM.screen("c1ccccc1", "benzene")
    assert a[0] == b[0] and a[1] == b[1]


def _request(mode: str = "Balanced") -> OptimizeRequest:
    return OptimizeRequest(
        session_id="00000000-0000-0000-0000-000000000001",
        fabric_profile=FabricProfile(
            fabric_type="blend",
            cotton_pct=65,
            polyester_pct=35,
            density_gm2=180,
            mass_kg=5.0,
        ),
        chemical_profile=ChemicalProfile(
            molecular_weight=456.2,
            logP=2.43,
            tpsa=88.35,
            hbd=2,
            hba=7,
            rotatable_bonds=6,
            aromatic_rings=3,
            compatibility_score=84,
            solubility_score=71,
        ),
        optimization_mode=mode,
    )


def test_pipeline_produces_full_response():
    pipeline = EnginePipeline()
    resp = pipeline.run(_request())
    assert len(resp.simulation_outputs.kinetic_curve) == 50
    # K/S curve is monotonically non-decreasing.
    ks = [p.ks_value for p in resp.simulation_outputs.kinetic_curve]
    assert all(b >= a - 1e-6 for a, b in zip(ks, ks[1:]))
    # All four parameters explained.
    assert set(resp.explainability.keys()) == {
        "pressure_bar",
        "temperature_c",
        "time_min",
        "flow_rate_kgmin",
    }
    # SHAP additivity: contributions sum to (predicted - baseline).
    for entry in resp.explainability.values():
        total = sum(s.value for s in entry.shap_values)
        assert abs(total - (entry.predicted - entry.baseline)) < 0.5
    assert resp.risk_assessment.overall_risk in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_eco_mode_is_greener_than_performance():
    pipeline = EnginePipeline()
    eco = pipeline.run(_request("Eco"))
    perf = pipeline.run(_request("Performance"))
    assert (
        eco.recommended_parameters.pressure_bar
        <= perf.recommended_parameters.pressure_bar
    )
