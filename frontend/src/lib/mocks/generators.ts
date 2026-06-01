/**
 * Deterministic mock generators.
 *
 * Every output is a pure function of its inputs so the demo is stable: the same
 * SMILES always yields the same descriptors and scores, the same parameters
 * always yield the same curves. The math is physically *plausible* (not a real
 * RDKit/XGBoost model) — enough to make the UI behave realistically.
 */

import {
  MODE_ORDER,
  PARAM_ORDER,
} from "@/lib/constants";
import type {
  AdaptRequest,
  AdaptResponse,
  Explainability,
  ExplainabilityEntry,
  ExplainParameter,
  KineticDataPoint,
  MolecularDescriptors,
  OptimizationMode,
  OptimizeRequest,
  OptimizeResponse,
  ProcessParameters,
  RiskAssessment,
  RiskComponentKey,
  RiskLevel,
  ScenarioSummary,
  ScreenRequest,
  ScreeningResult,
  ShapValue,
} from "@/lib/types";

// ── tiny deterministic helpers ───────────────────────────────

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const round = (v: number, p = 0) => {
  const f = 10 ** p;
  return Math.round(v * f) / f;
};
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic [0,1) jitter seeded by a string + salt. */
function jitter(seed: string, salt: number): number {
  let t = (hashString(seed) + salt * 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── chemical screening ───────────────────────────────────────

export function mockScreen(req: ScreenRequest): ScreeningResult {
  const s = req.smiles.trim();
  const carbons = count(s, /[Cc]/g);
  const nitrogens = count(s, /[Nn]/g);
  const oxygens = count(s, /[Oo]/g);
  const sulfurs = count(s, /[Ss]/g);
  const aromaticAtoms = count(s, /[a-z]/g);
  const ringClosures = count(s, /\d/g);
  const heavyAtoms = carbons + nitrogens + oxygens + sulfurs;

  const aromatic_rings = clamp(Math.round(ringClosures / 2), 0, 8);
  const molecular_weight = round(
    carbons * 12.01 +
      nitrogens * 14.01 +
      oxygens * 16.0 +
      sulfurs * 32.06 +
      carbons * 1.6, // implicit hydrogens, approx
    1,
  );
  const tpsa = round(oxygens * 20.2 + nitrogens * 12.4, 1);
  const logP = round(
    clamp(carbons * 0.22 - (oxygens + nitrogens) * 0.55 + aromaticAtoms * 0.18, -3, 9),
    2,
  );
  const hba = oxygens + nitrogens;
  const hbd = clamp(Math.round((oxygens + nitrogens) * 0.35), 0, hba);
  const rotatable_bonds = clamp(
    Math.round(heavyAtoms * 0.22) - aromatic_rings,
    0,
    30,
  );

  const descriptors: MolecularDescriptors = {
    molecular_weight,
    logP,
    tpsa,
    hbd,
    hba,
    rotatable_bonds,
    aromatic_rings,
  };

  // scCO₂ favours low polarity, moderate MW (250-600), moderate logP (1.5-4.5).
  let solubility = 100;
  solubility -= Math.max(0, tpsa - 80) * 0.55;
  solubility -= Math.abs(molecular_weight - 420) * 0.06;
  solubility -= Math.abs(logP - 3) * 6;
  solubility -= hbd * 4;
  solubility += jitter(s, 1) * 8 - 4;

  let compatibility = 100;
  compatibility -= Math.max(0, tpsa - 90) * 0.5;
  compatibility -= Math.max(0, molecular_weight - 650) * 0.05;
  compatibility -= Math.max(0, 200 - molecular_weight) * 0.08;
  compatibility += clamp(aromatic_rings, 0, 4) * 3; // disperse-dye friendly
  compatibility -= hbd * 3;
  compatibility += jitter(s, 2) * 8 - 4;

  return {
    compatibility_score: clamp(Math.round(compatibility), 3, 99),
    solubility_score: clamp(Math.round(solubility), 3, 99),
    descriptors,
  };
}

// ── process optimization ─────────────────────────────────────

const MODE_BASE: Record<OptimizationMode, ProcessParameters> = {
  eco: { pressure: 180, temperature: 110, time: 90, flow_rate: 0.8 },
  balanced: { pressure: 250, temperature: 130, time: 65, flow_rate: 1.1 },
  performance: { pressure: 310, temperature: 155, time: 40, flow_rate: 1.6 },
};

function recommendedFor(
  mode: OptimizationMode,
  chem: ScreeningResult,
): ProcessParameters {
  const base = MODE_BASE[mode];
  const mwShift = (chem.descriptors.molecular_weight - 420) / 40; // heavier → more pressure
  const tpsaShift = chem.descriptors.tpsa / 60; // polar → more temperature
  return {
    pressure: clamp(round(base.pressure + mwShift * 6), 100, 400),
    temperature: clamp(round(base.temperature + tpsaShift * 3), 80, 200),
    time: base.time,
    flow_rate: base.flow_rate,
  };
}

function kineticCurve(
  params: ProcessParameters,
  ksFinal: number,
  startConc: number,
): KineticDataPoint[] {
  const points: KineticDataPoint[] = [];
  const steps = 24;
  // uptake rate rises with temperature & pressure
  const k = 0.02 + (params.temperature - 80) / 4000 + (params.pressure - 100) / 9000;
  const decay = 0.015 + params.flow_rate / 200;
  for (let i = 0; i <= steps; i++) {
    const t = round((params.time / steps) * i, 1);
    points.push({
      time: t,
      ks: round(ksFinal * (1 - Math.exp(-k * t)), 2),
      dye_concentration: round(startConc * Math.exp(-decay * t) + 0.2, 2),
    });
  }
  return points;
}

function buildRisk(
  params: ProcessParameters,
  chem: ScreeningResult,
  uptake: number,
  seed: string,
): RiskAssessment {
  const c = chem.descriptors;
  const probs: Record<RiskComponentKey, number> = {
    dye_degradation: clamp(
      (params.temperature - 110) / 130 +
        (params.time - 40) / 320 -
        c.aromatic_rings * 0.02 +
        jitter(seed, 11) * 0.06,
      0.02,
      0.97,
    ),
    process_instability: clamp(
      Math.abs(params.pressure / params.temperature - 1.9) * 0.55 +
        jitter(seed, 12) * 0.08,
      0.02,
      0.97,
    ),
    equipment_stress: clamp(
      (params.pressure - 180) / 280 + jitter(seed, 13) * 0.05,
      0.02,
      0.97,
    ),
    low_color_yield: clamp(
      (92 - uptake) / 110 + jitter(seed, 14) * 0.05,
      0.02,
      0.97,
    ),
  };

  const max = Math.max(...Object.values(probs));
  let overall_risk: RiskLevel = "LOW";
  if (max >= 0.75) overall_risk = "CRITICAL";
  else if (max >= 0.6) overall_risk = "HIGH";
  else if (max >= 0.35) overall_risk = "MEDIUM";

  const components = Object.fromEntries(
    (Object.keys(probs) as RiskComponentKey[]).map((key) => [
      key,
      {
        probability: round(probs[key], 3),
        confidence: round(0.78 + jitter(seed, 20 + key.length) * 0.17, 2),
      },
    ]),
  ) as RiskAssessment["components"];

  const alerts: string[] = [];
  if (probs.equipment_stress >= 0.6)
    alerts.push("Chamber pressure approaches equipment fatigue thresholds.");
  if (probs.dye_degradation >= 0.6)
    alerts.push("Sustained temperature risks thermal dye degradation.");
  if (probs.process_instability >= 0.6)
    alerts.push("Pressure/temperature ratio is near a fluid phase boundary.");
  if (probs.low_color_yield >= 0.6)
    alerts.push("Predicted uptake may fall short of the target shade.");

  return {
    overall_risk,
    confidence: round(0.8 + jitter(seed, 99) * 0.12, 2),
    components,
    alerts,
  };
}

const SHAP_FEATURES: { feature: string; description: string }[] = [
  { feature: "Molecular Weight", description: "Heavier molecules need higher pressure to dissolve." },
  { feature: "LogP", description: "Lipophilicity drives solubility in non-polar scCO₂." },
  { feature: "TPSA", description: "Polar surface area resists dissolution, pushing temperature." },
  { feature: "Fabric Density", description: "Denser fabric slows diffusion into fibers." },
  { feature: "Blend Ratio", description: "Polyester fraction favors disperse-dye kinetics." },
  { feature: "Target Shade", description: "Deeper target shades require more aggressive settings." },
];

function buildExplainability(
  params: ProcessParameters,
  req: OptimizeRequest,
  seed: string,
): Explainability {
  const chem = req.chemical_profile.descriptors;
  const fabric = req.fabric_profile;
  const entries = PARAM_ORDER.map((param): [ExplainParameter, ExplainabilityEntry] => {
    const predicted = params[param];
    const baseline = round(predicted * 0.8, 2);
    const target = predicted - baseline;

    // Raw signed weights per feature, then scaled to sum to (predicted-baseline).
    const raw = [
      (chem.molecular_weight - 420) / 100,
      (chem.logP - 3) * 0.4,
      (chem.tpsa - 70) / 60,
      (fabric.density - 180) / 120,
      (fabric.polyester_pct - 50) / 60,
      (req.chemical_profile.compatibility_score - 60) / 80,
    ].map((w, i) => w + (jitter(seed + param, i) - 0.5) * 0.3);

    const sumAbs = raw.reduce((a, b) => a + Math.abs(b), 0) || 1;
    const shap_values: ShapValue[] = SHAP_FEATURES.map((f, i) => ({
      feature: f.feature,
      description: f.description,
      value: round((raw[i] / sumAbs) * target, 2),
    }));

    return [param, { parameter: param, baseline, predicted, shap_values }];
  });
  return Object.fromEntries(entries) as Explainability;
}

function scenarioSummaries(
  chem: ScreeningResult,
): Record<OptimizationMode, ScenarioSummary> {
  const entries = MODE_ORDER.map((mode): [OptimizationMode, ScenarioSummary] => {
    const parameters = recommendedFor(mode, chem);
    const ks_index = round(
      10 + (parameters.pressure / 30) + (parameters.temperature - 110) / 15,
      1,
    );
    return [
      mode,
      {
        mode,
        parameters,
        ks_index,
        ks_variance: round(0.4 + (mode === "performance" ? 0.9 : 0.3), 2),
        co2_reduction:
          mode === "eco" ? 48 : mode === "balanced" ? 31 : 12,
      },
    ];
  });
  return Object.fromEntries(entries) as Record<OptimizationMode, ScenarioSummary>;
}

export function mockOptimize(req: OptimizeRequest): OptimizeResponse {
  const mode = req.optimization_mode;
  const recommended = recommendedFor(mode, req.chemical_profile);
  const params: ProcessParameters = {
    ...recommended,
    ...(req.manual_overrides ?? {}),
  };
  const seed = `${req.chemical_profile.compatibility_score}-${mode}-${params.pressure}-${params.temperature}-${params.time}-${params.flow_rate}`;

  const sol = req.chemical_profile.solubility_score / 100;
  const dye_uptake = clamp(
    round(
      55 +
        (params.pressure - 180) / 8 +
        (params.temperature - 110) / 5 +
        params.time / 6 +
        sol * 12,
      1,
    ),
    20,
    99,
  );
  const color_intensity = round(8 + (dye_uptake / 100) * 18 + sol * 4, 1);
  const efficiency = clamp(
    round(100 - params.time / 2.5 + dye_uptake / 4 - params.pressure / 40, 0),
    30,
    99,
  );
  const startConc = round(4 + sol * 8, 2);

  const simulation_outputs = {
    dye_uptake,
    color_intensity,
    efficiency,
    kinetic_curve: kineticCurve(params, color_intensity, startConc),
  };

  const energy_reduction =
    mode === "eco" ? 48 : mode === "balanced" ? 31 : 12;
  const sustainability_metrics = {
    water_savings: round(99.4 + jitter(seed, 7) * 0.5, 1),
    energy_reduction: round(
      energy_reduction - (params.temperature - MODE_BASE[mode].temperature) / 5,
      1,
    ),
    carbon_saved: round(
      req.fabric_profile.mass_load * 0.52 * (energy_reduction / 40),
      2,
    ),
    e_factor: round(0.02 + (mode === "performance" ? 0.05 : 0.01), 3),
  };

  return {
    recommended_parameters: recommended,
    simulation_outputs,
    sustainability_metrics,
    risk_assessment: buildRisk(params, req.chemical_profile, dye_uptake, seed),
    explainability: buildExplainability(params, req, seed),
    scenarios: scenarioSummaries(req.chemical_profile),
  };
}

// ── adaptive feedback ────────────────────────────────────────

export function mockAdapt(req: AdaptRequest): AdaptResponse {
  const seed = `${req.session_id}-${req.experimental_feedback.actual_ks}`;
  const previous = round(0.82 + jitter(seed, 1) * 0.08, 3);
  const delta = round(0.005 + jitter(seed, 2) * 0.02, 3);
  return {
    status: "ok",
    model_confidence: {
      previous,
      current: round(Math.min(0.99, previous + delta), 3),
      delta,
    },
  };
}
