from uuid import UUID

from pydantic import BaseModel, Field

from src.models.enums import OptimizationMode, RiskLevel

# ── Safe operating envelopes (enforced on manual overrides) ────
PRESSURE_BOUNDS = (100.0, 400.0)
TEMPERATURE_BOUNDS = (80.0, 200.0)
TIME_BOUNDS = (20.0, 150.0)
FLOW_BOUNDS = (0.3, 2.5)


class FabricProfile(BaseModel):
    fabric_type: str
    cotton_pct: float = Field(ge=0, le=100)
    polyester_pct: float = Field(ge=0, le=100)
    density_gm2: float = Field(gt=0, le=2000)
    mass_kg: float = Field(gt=0, le=1000)


class ChemicalProfile(BaseModel):
    molecular_weight: float
    logP: float
    tpsa: float
    hbd: int
    hba: int
    rotatable_bonds: int
    aromatic_rings: int
    compatibility_score: int = Field(ge=0, le=100)
    solubility_score: int = Field(ge=0, le=100)


class ManualOverrides(BaseModel):
    pressure: float | None = Field(default=None, ge=PRESSURE_BOUNDS[0], le=PRESSURE_BOUNDS[1])
    temperature: float | None = Field(default=None, ge=TEMPERATURE_BOUNDS[0], le=TEMPERATURE_BOUNDS[1])
    time: float | None = Field(default=None, ge=TIME_BOUNDS[0], le=TIME_BOUNDS[1])
    flow_rate: float | None = Field(default=None, ge=FLOW_BOUNDS[0], le=FLOW_BOUNDS[1])


class OptimizeRequest(BaseModel):
    session_id: UUID
    fabric_profile: FabricProfile
    chemical_profile: ChemicalProfile
    optimization_mode: OptimizationMode
    manual_overrides: ManualOverrides | None = None


# ── Internal normalized parameter bundle used by the engines ───
class ProcessParams(BaseModel):
    pressure: float
    temperature: float
    time: float
    flow_rate: float


class RecommendedParameters(BaseModel):
    pressure_bar: float
    temperature_c: float
    time_min: float
    flow_rate_kgmin: float

    @classmethod
    def from_params(cls, p: ProcessParams) -> "RecommendedParameters":
        return cls(
            pressure_bar=round(p.pressure, 1),
            temperature_c=round(p.temperature, 1),
            time_min=round(p.time, 1),
            flow_rate_kgmin=round(p.flow_rate, 2),
        )


class KineticPoint(BaseModel):
    time_min: float
    ks_value: float
    dye_concentration_mgL: float


class SimulationOutputs(BaseModel):
    dye_uptake_pct: float
    color_intensity_ks: float
    process_efficiency_pct: float
    kinetic_curve: list[KineticPoint]


class SustainabilityMetrics(BaseModel):
    water_savings_pct: float
    energy_reduction_pct: float
    carbon_saved_kg_co2e: float
    e_factor_kg_per_kg: float


class RiskComponent(BaseModel):
    probability: float
    confidence: float


class RiskAssessment(BaseModel):
    overall_risk: RiskLevel
    overall_confidence: float
    components: dict[str, RiskComponent]
    alerts: list[str]


class ShapValue(BaseModel):
    feature: str
    value: float
    description: str


class ParameterExplanation(BaseModel):
    baseline: float
    predicted: float
    shap_values: list[ShapValue]


class OptimizeResponse(BaseModel):
    session_id: UUID
    recommended_parameters: RecommendedParameters
    simulation_outputs: SimulationOutputs
    sustainability_metrics: SustainabilityMetrics
    risk_assessment: RiskAssessment
    explainability: dict[str, ParameterExplanation]
    compute_time_ms: float
    model_version: str
