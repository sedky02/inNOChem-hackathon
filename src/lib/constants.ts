import type {
  ExplainParameter,
  OptimizationMode,
  RiskComponentKey,
} from "@/lib/types";

/** Scenario-mode display metadata (label, accent token, blurb). */
export const MODE_META: Record<
  OptimizationMode,
  { label: string; icon: string; accent: string; blurb: string }
> = {
  eco: {
    label: "Eco",
    icon: "Leaf",
    accent: "var(--color-eco)",
    blurb:
      "Aggressively minimizes carbon footprint and pressure at the cost of longer run times.",
  },
  balanced: {
    label: "Balanced",
    icon: "Scale",
    accent: "var(--color-balanced)",
    blurb:
      "A multi-objective compromise — solid environmental savings with healthy throughput.",
  },
  performance: {
    label: "Performance",
    icon: "Zap",
    accent: "var(--color-performance)",
    blurb:
      "Minimizes cycle time and maximizes color saturation, accepting higher resource use.",
  },
};

export const MODE_ORDER: OptimizationMode[] = ["eco", "balanced", "performance"];

/** Slider envelopes for the kinetic-simulation sandbox (Step 3). */
export const PARAM_RANGES: Record<
  ExplainParameter,
  { min: number; max: number; step: number; unit: string; label: string }
> = {
  pressure: { min: 100, max: 400, step: 5, unit: "bar", label: "Chamber Pressure" },
  temperature: { min: 80, max: 200, step: 1, unit: "°C", label: "Core Temperature" },
  time: { min: 20, max: 150, step: 1, unit: "min", label: "Cycle Time" },
  flow_rate: { min: 0.3, max: 2.5, step: 0.1, unit: "kg/min", label: "CO₂ Flow Rate" },
};

export const PARAM_ORDER: ExplainParameter[] = [
  "pressure",
  "temperature",
  "time",
  "flow_rate",
];

/** Molecular-descriptor display metadata (label, unit, precision). */
export const DESCRIPTOR_META: {
  key: keyof import("@/lib/types").MolecularDescriptors;
  label: string;
  unit?: string;
  precision: number;
}[] = [
  { key: "molecular_weight", label: "Molecular Weight", unit: "g/mol", precision: 1 },
  { key: "logP", label: "LogP", precision: 2 },
  { key: "tpsa", label: "TPSA", unit: "Å²", precision: 1 },
  { key: "hbd", label: "H-Bond Donors", precision: 0 },
  { key: "hba", label: "H-Bond Acceptors", precision: 0 },
  { key: "rotatable_bonds", label: "Rotatable Bonds", precision: 0 },
  { key: "aromatic_rings", label: "Aromatic Rings", precision: 0 },
];

export const RISK_COMPONENT_META: Record<
  RiskComponentKey,
  { label: string; description: string }
> = {
  dye_degradation: {
    label: "Dye Degradation",
    description:
      "Probability the dye's molecular bonds split under sustained heat and pressure.",
  },
  process_instability: {
    label: "Process Instability",
    description:
      "Volatility of the chamber environment and risk of fluid phase separation.",
  },
  equipment_stress: {
    label: "Equipment Stress",
    description:
      "Structural fatigue on gaskets, seals, and chamber walls at extreme bar levels.",
  },
  low_color_yield: {
    label: "Low Color Yield",
    description:
      "Risk the finalized run fails to satisfy the required shade profile.",
  },
};

export const RISK_ORDER: RiskComponentKey[] = [
  "dye_degradation",
  "process_instability",
  "equipment_stress",
  "low_color_yield",
];

export const WIZARD_STEPS = [
  { step: 1, slug: "step-1", label: "Molecular", title: "Molecular Screening" },
  { step: 2, slug: "step-2", label: "Scenarios", title: "Process Scenarios" },
  { step: 3, slug: "step-3", label: "Simulation", title: "Kinetic Simulation" },
  { step: 4, slug: "step-4", label: "Risk & XAI", title: "Risk & Explainability" },
  { step: 5, slug: "step-5", label: "Output", title: "Configuration Output" },
] as const;
