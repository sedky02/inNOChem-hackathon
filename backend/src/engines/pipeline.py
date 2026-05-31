"""EnginePipeline — orchestrates the full optimize pipeline in-process.

Sequence (spec §2): optimization (parameters) → simulation → sustainability →
risk → explainability. Engines are instantiated once and reused (models loaded
at construction). This object is CPU-bound and is invoked via run_in_executor
from the async API layer.
"""

from __future__ import annotations

import time

from src.engines.explainability_engine import ExplainabilityEngine
from src.engines.optimization_engine import OptimizationEngine
from src.engines.risk_engine import RiskEngine
from src.engines.simulation_engine import SimulationEngine
from src.engines.sustainability_engine import SustainabilityEngine
from src.schemas.process import (
    OptimizeRequest,
    OptimizeResponse,
    ProcessParams,
    RecommendedParameters,
)


class EnginePipeline:
    def __init__(self) -> None:
        self.optimizer = OptimizationEngine()
        self.simulator = SimulationEngine()
        self.sustainability = SustainabilityEngine()
        self.risk = RiskEngine()
        self.explainer = ExplainabilityEngine()

    def run(self, request: OptimizeRequest) -> OptimizeResponse:
        start = time.perf_counter()
        mol = request.chemical_profile
        fabric = request.fabric_profile

        # 1) Recommended parameters (or manual overrides layered on top).
        recommended = self.optimizer.predict(mol, fabric, request.optimization_mode.value)
        params = self._apply_overrides(recommended, request)

        # 2-5) Downstream engines.
        simulation = self.simulator.simulate(params, mol, fabric)
        sustainability = self.sustainability.calculate(params, fabric.mass_kg)
        risk = self.risk.assess(
            params, mol, simulation.dye_uptake_pct, fabric, request.smiles
        )
        explainability = self.explainer.explain(params, mol, fabric)

        compute_ms = (time.perf_counter() - start) * 1000.0
        return OptimizeResponse(
            session_id=request.session_id,
            recommended_parameters=RecommendedParameters.from_params(params),
            simulation_outputs=simulation,
            sustainability_metrics=sustainability,
            risk_assessment=risk,
            explainability=explainability,
            compute_time_ms=round(compute_ms, 1),
            model_version=self.optimizer.model_version,
        )

    @staticmethod
    def _apply_overrides(
        recommended: ProcessParams, request: OptimizeRequest
    ) -> ProcessParams:
        o = request.manual_overrides
        if o is None:
            return recommended
        return ProcessParams(
            pressure=o.pressure if o.pressure is not None else recommended.pressure,
            temperature=o.temperature if o.temperature is not None else recommended.temperature,
            time=o.time if o.time is not None else recommended.time,
            flow_rate=o.flow_rate if o.flow_rate is not None else recommended.flow_rate,
        )


# Singleton pipeline (models loaded once at import).
pipeline = EnginePipeline()
