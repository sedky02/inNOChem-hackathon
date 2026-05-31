/**
 * GreenDye Twin — shared domain types.
 *
 * These mirror the FastAPI data contracts (project spec §5). The mock layer
 * and the eventual real backend both resolve to these shapes, so components
 * never need to change when the data source is swapped.
 */

// ─────────────────────────────────────────────────────────────
// Chemical screening — POST /api/v1/chemical/screen
// ─────────────────────────────────────────────────────────────

export interface MolecularDescriptors {
  molecular_weight: number;
  logP: number;
  tpsa: number;
  hbd: number; // hydrogen-bond donors
  hba: number; // hydrogen-bond acceptors
  rotatable_bonds: number;
  aromatic_rings: number;
}

export interface ScreenRequest {
  dye_name: string;
  smiles: string;
}

export interface ScreeningResult {
  compatibility_score: number; // 0-100
  solubility_score: number; // 0-100
  descriptors: MolecularDescriptors;
}

export type CompatibilityLabel = "COMPATIBLE" | "MARGINAL" | "INCOMPATIBLE";

// ─────────────────────────────────────────────────────────────
// Fabric profile
// ─────────────────────────────────────────────────────────────

export type FabricType =
  | "cotton"
  | "polyester"
  | "nylon"
  | "silk"
  | "blend";

export interface FabricProfile {
  fabric_type: FabricType;
  cotton_pct: number; // 0-100
  polyester_pct: number; // 0-100 (cotton_pct + polyester_pct = 100)
  density: number; // g/m²
  mass_load: number; // kg
}

// ─────────────────────────────────────────────────────────────
// Process optimization — POST /api/v1/process/optimize
// ─────────────────────────────────────────────────────────────

export type OptimizationMode = "eco" | "balanced" | "performance";

export interface ProcessParameters {
  pressure: number; // bar
  temperature: number; // °C
  time: number; // min
  flow_rate: number; // kg/min
}

export type ProcessOverrides = Partial<ProcessParameters>;

export interface KineticDataPoint {
  time: number; // min
  ks: number; // K/S color strength
  dye_concentration: number; // mg/L in scCO₂
}

export interface SimulationOutputs {
  dye_uptake: number; // %
  color_intensity: number; // K/S index
  efficiency: number; // %
  kinetic_curve: KineticDataPoint[];
}

export interface SustainabilityMetrics {
  water_savings: number; // %
  energy_reduction: number; // %
  carbon_saved: number; // kg CO₂e
  e_factor: number; // kg waste / kg product
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskComponent {
  probability: number; // 0-1
  confidence: number; // 0-1
}

export type RiskComponentKey =
  | "dye_degradation"
  | "process_instability"
  | "equipment_stress"
  | "low_color_yield";

export interface RiskAssessment {
  overall_risk: RiskLevel;
  confidence: number; // 0-1
  components: Record<RiskComponentKey, RiskComponent>;
  alerts: string[];
}

export interface ShapValue {
  feature: string;
  value: number; // signed contribution
  description: string;
}

export type ExplainParameter = keyof ProcessParameters;

export interface ExplainabilityEntry {
  parameter: ExplainParameter;
  baseline: number;
  predicted: number;
  shap_values: ShapValue[];
}

export type Explainability = Record<ExplainParameter, ExplainabilityEntry>;

/** Summary shown on the three Step-2 scenario cards. */
export interface ScenarioSummary {
  mode: OptimizationMode;
  parameters: ProcessParameters;
  ks_index: number;
  ks_variance: number;
  co2_reduction: number; // %
}

export interface OptimizeRequest {
  fabric_profile: FabricProfile;
  chemical_profile: ScreeningResult;
  optimization_mode: OptimizationMode;
  manual_overrides?: ProcessOverrides;
}

export interface OptimizeResponse {
  recommended_parameters: ProcessParameters;
  simulation_outputs: SimulationOutputs;
  sustainability_metrics: SustainabilityMetrics;
  risk_assessment: RiskAssessment;
  explainability: Explainability;
  /** All three preset summaries for the scenario-selection screen. */
  scenarios: Record<OptimizationMode, ScenarioSummary>;
}

// ─────────────────────────────────────────────────────────────
// Config manifest (Step 5)
// ─────────────────────────────────────────────────────────────

export interface ConfigManifest {
  session_id: string;
  timestamp: string; // ISO
  verification_hash: string;
  dye_name: string;
  mode: OptimizationMode;
  parameters: ProcessParameters;
  signature: string;
  engineer_ack: boolean;
}

// ─────────────────────────────────────────────────────────────
// Adaptive feedback — POST /api/v1/model/adapt
// ─────────────────────────────────────────────────────────────

export interface ExperimentalFeedback {
  actual_ks: number;
  actual_pressure: number;
  actual_temperature: number;
  actual_flow_rate: number;
  notes?: string;
}

export interface AdaptRequest {
  session_id: string;
  experimental_feedback: ExperimentalFeedback;
}

export interface AdaptResponse {
  status: string;
  model_confidence: {
    previous: number;
    current: number;
    delta: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Sessions & dashboard
// ─────────────────────────────────────────────────────────────

export type SessionStatus = "complete" | "in_progress" | "failed" | "pending";

export interface SessionSummary {
  id: string;
  dye_name: string;
  mode: OptimizationMode | null;
  compatibility_score: number | null;
  risk_level: RiskLevel | null;
  created_at: string; // ISO
  status: SessionStatus;
}

export interface DashboardAggregate {
  period_label: string;
  water_saved_l: number;
  co2_saved_tons: number;
  energy_saved_pct: number;
  total_sessions: number;
  completed_sessions: number;
}
