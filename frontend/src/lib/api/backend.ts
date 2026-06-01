/**
 * Real-backend adapter.
 *
 * The FastAPI backend speaks the spec contract (pressure_bar, dye_uptake_pct,
 * French-free risk enums, one mode per /process/optimize call, JWT auth). This
 * module maps those shapes onto the frontend's types and synthesizes the
 * three-mode `scenarios` block the wizard's Step 2 expects. It is only used
 * when NEXT_PUBLIC_USE_MOCKS=false.
 */

import { apiClient } from "@/lib/api/client";
import { setAccessToken } from "@/lib/api/token";
import { MODE_ORDER } from "@/lib/constants";
import type {
  AdaptRequest,
  AdaptResponse,
  DashboardAggregate,
  Explainability,
  ExplainParameter,
  FabricProfile,
  OptimizationMode,
  OptimizeRequest,
  OptimizeResponse,
  RiskAssessment,
  ScenarioSummary,
  ScreeningResult,
  ScreenRequest,
  SessionSummary,
  SimulationOutputs,
  SustainabilityMetrics,
} from "@/lib/types";

// ── mode mapping ─────────────────────────────────────────────
const TO_BACKEND: Record<OptimizationMode, string> = {
  eco: "Eco",
  balanced: "Balanced",
  performance: "Performance",
};
function toFrontendMode(m: string | null): OptimizationMode | null {
  if (!m) return null;
  const lower = m.toLowerCase();
  return (["eco", "balanced", "performance"].includes(lower)
    ? (lower as OptimizationMode)
    : null);
}

const PARAM_KEY_MAP: Record<string, ExplainParameter> = {
  pressure_bar: "pressure",
  temperature_c: "temperature",
  time_min: "time",
  flow_rate_kgmin: "flow_rate",
};

// ── auth ─────────────────────────────────────────────────────
export async function loginBackend(email: string, password: string) {
  const { data } = await apiClient.post("/api/v1/auth/login", { email, password });
  setAccessToken(data.access_token);
  return data.user as { full_name: string; email: string; role: string };
}

// ── request shape helpers ────────────────────────────────────
function backendFabric(f: FabricProfile) {
  return {
    fabric_type: f.fabric_type,
    cotton_pct: f.cotton_pct,
    polyester_pct: f.polyester_pct,
    density_gm2: f.density,
    mass_kg: f.mass_load,
  };
}
function backendChemical(c: ScreeningResult) {
  return { ...c.descriptors, compatibility_score: c.compatibility_score, solubility_score: c.solubility_score };
}

// ── response mappers ─────────────────────────────────────────
function mapSimulation(s: Record<string, unknown>): SimulationOutputs {
  const curve = (s.kinetic_curve as Record<string, number>[]) ?? [];
  return {
    dye_uptake: s.dye_uptake_pct as number,
    color_intensity: s.color_intensity_ks as number,
    efficiency: s.process_efficiency_pct as number,
    kinetic_curve: curve.map((p) => ({
      time: p.time_min,
      ks: p.ks_value,
      dye_concentration: p.dye_concentration_mgL,
    })),
  };
}
function mapSustainability(s: Record<string, number>): SustainabilityMetrics {
  return {
    water_savings: s.water_savings_pct,
    energy_reduction: s.energy_reduction_pct,
    carbon_saved: s.carbon_saved_kg_co2e,
    e_factor: s.e_factor_kg_per_kg,
  };
}
function mapRisk(r: Record<string, unknown>): RiskAssessment {
  return {
    overall_risk: r.overall_risk as RiskAssessment["overall_risk"],
    confidence: r.overall_confidence as number,
    components: r.components as RiskAssessment["components"],
    alerts: (r.alerts as string[]) ?? [],
  };
}
function mapExplainability(e: Record<string, Record<string, unknown>>): Explainability {
  const out = {} as Explainability;
  for (const [backendKey, entry] of Object.entries(e)) {
    const key = PARAM_KEY_MAP[backendKey];
    if (!key) continue;
    out[key] = {
      parameter: key,
      baseline: entry.baseline as number,
      predicted: entry.predicted as number,
      shap_values: entry.shap_values as Explainability[ExplainParameter]["shap_values"],
    };
  }
  return out;
}

async function callOptimize(req: OptimizeRequest, mode: OptimizationMode) {
  const body = {
    session_id: req.session_id,
    fabric_profile: backendFabric(req.fabric_profile),
    chemical_profile: backendChemical(req.chemical_profile),
    optimization_mode: TO_BACKEND[mode],
    manual_overrides: req.manual_overrides ?? null,
  };
  const { data } = await apiClient.post("/api/v1/process/optimize", body);
  return data as Record<string, unknown>;
}

function scenarioFrom(mode: OptimizationMode, data: Record<string, unknown>): ScenarioSummary {
  const rp = data.recommended_parameters as Record<string, number>;
  const sim = data.simulation_outputs as Record<string, number>;
  const sust = data.sustainability_metrics as Record<string, number>;
  return {
    mode,
    parameters: {
      pressure: rp.pressure_bar,
      temperature: rp.temperature_c,
      time: rp.time_min,
      flow_rate: rp.flow_rate_kgmin,
    },
    ks_index: sim.color_intensity_ks,
    ks_variance: Math.round(sim.color_intensity_ks * 0.05 * 100) / 100,
    co2_reduction: Math.round(sust.energy_reduction_pct),
  };
}

// Cache the three scenario summaries per session so slider-driven override
// calls don't recompute all modes on every keystroke.
const scenarioCache = new Map<string, Record<OptimizationMode, ScenarioSummary>>();

export async function optimizeBackend(req: OptimizeRequest): Promise<OptimizeResponse> {
  const mode = req.optimization_mode;
  const primary = await callOptimize(req, mode);

  const cacheKey = req.session_id ?? "anon";
  let scenarios = scenarioCache.get(cacheKey);
  if (!scenarios || !req.manual_overrides) {
    const entries = await Promise.all(
      MODE_ORDER.map(async (m) => {
        const data = m === mode && !req.manual_overrides ? primary : await callOptimize({ ...req, manual_overrides: undefined }, m);
        return [m, scenarioFrom(m, data)] as const;
      }),
    );
    scenarios = Object.fromEntries(entries) as Record<OptimizationMode, ScenarioSummary>;
    scenarioCache.set(cacheKey, scenarios);
  }

  const rp = primary.recommended_parameters as Record<string, number>;
  return {
    recommended_parameters: {
      pressure: rp.pressure_bar,
      temperature: rp.temperature_c,
      time: rp.time_min,
      flow_rate: rp.flow_rate_kgmin,
    },
    simulation_outputs: mapSimulation(primary.simulation_outputs as Record<string, unknown>),
    sustainability_metrics: mapSustainability(primary.sustainability_metrics as Record<string, number>),
    risk_assessment: mapRisk(primary.risk_assessment as Record<string, unknown>),
    explainability: mapExplainability(primary.explainability as Record<string, Record<string, unknown>>),
    scenarios,
  };
}

export async function screenBackend(
  req: ScreenRequest,
  sessionId: string,
): Promise<ScreeningResult> {
  const { data } = await apiClient.post("/api/v1/chemical/screen", {
    session_id: sessionId,
    dye_name: req.dye_name,
    smiles: req.smiles,
    force: true,
  });
  return {
    compatibility_score: data.compatibility_score,
    solubility_score: data.solubility_score,
    descriptors: data.descriptors,
  };
}

export async function adaptBackend(req: AdaptRequest): Promise<AdaptResponse> {
  const { data } = await apiClient.post("/api/v1/model/adapt", req);
  const mc = data.model_confidence;
  return {
    status: data.status,
    model_confidence: {
      previous: mc.previous_accuracy,
      current: mc.current_accuracy,
      delta: mc.delta,
    },
  };
}

export async function createSessionBackend(dyeName: string): Promise<SessionSummary> {
  const { data } = await apiClient.post("/api/v1/sessions", {
    session_name: dyeName || "Untitled experiment",
  });
  return {
    id: data.session_id,
    dye_name: data.session_name,
    mode: null,
    compatibility_score: null,
    risk_level: null,
    created_at: data.created_at,
    status: data.status,
  };
}

export async function fetchSessionsBackend(): Promise<SessionSummary[]> {
  const { data } = await apiClient.get("/api/v1/sessions?limit=100");
  return (data.items as Record<string, unknown>[]).map((s) => ({
    id: s.session_id as string,
    dye_name: (s.dye_name as string) ?? (s.session_name as string),
    mode: toFrontendMode(s.optimization_mode as string | null),
    compatibility_score: (s.compatibility_score as number) ?? null,
    risk_level: (s.overall_risk as SessionSummary["risk_level"]) ?? null,
    created_at: s.created_at as string,
    status: s.status as SessionSummary["status"],
  }));
}

export interface VerifyResult {
  verification_hash: string;
  verified_at: string;
}

export async function verifyBackend(
  sessionId: string,
  body: {
    acknowledged: boolean;
    engineer_notes: string;
    overall_risk_at_sign: string;
    force_override: boolean;
  },
): Promise<VerifyResult> {
  const { data } = await apiClient.post(
    `/api/v1/sessions/${sessionId}/verify`,
    body,
  );
  return { verification_hash: data.verification_hash, verified_at: data.verified_at };
}

/** Download a session export (json|pdf|csv) from the backend as a Blob. */
export async function exportSessionBackend(
  sessionId: string,
  format: "json" | "pdf" | "csv",
): Promise<Blob> {
  const { data } = await apiClient.get(`/api/v1/sessions/${sessionId}/export`, {
    params: { format },
    responseType: "blob",
  });
  return data as Blob;
}

export async function fetchAggregateBackend(): Promise<DashboardAggregate> {
  const { data } = await apiClient.get("/api/v1/dashboard/aggregate");
  return {
    period_label: "All time",
    water_saved_l: data.total_water_saved_liters,
    co2_saved_tons: Math.round((data.total_carbon_saved_kg_co2e / 1000) * 100) / 100,
    energy_saved_pct: data.average_energy_reduction_pct,
    total_sessions: data.total_sessions,
    completed_sessions: data.completed_sessions,
  };
}
