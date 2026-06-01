import type { CompatibilityLabel, RiskLevel } from "@/lib/types";

/** Derive the COMPATIBLE / MARGINAL / INCOMPATIBLE badge from a 0-100 score. */
export function compatibilityLabel(score: number): CompatibilityLabel {
  if (score >= 70) return "COMPATIBLE";
  if (score >= 40) return "MARGINAL";
  return "INCOMPATIBLE";
}

/** Score is too low to confidently proceed without an explicit override. */
export const MIN_COMPATIBILITY_SCORE = 40;

/** Tailwind text-color class for a 0-100 score (higher = greener). */
export function scoreColorClass(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

/** Hex for gauge arcs given a 0-100 score. */
export function scoreColorHex(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

/** Color for a 0-1 risk probability (higher = more dangerous). */
export function riskProbabilityHex(probability: number): string {
  if (probability < 0.3) return "#10b981";
  if (probability < 0.6) return "#f59e0b";
  return "#ef4444";
}

const RISK_LEVEL_CLASSES: Record<RiskLevel, string> = {
  LOW: "bg-success/15 text-success border-success/30",
  MEDIUM: "bg-warning/15 text-warning border-warning/30",
  HIGH: "bg-destructive/15 text-destructive border-destructive/30",
  CRITICAL: "bg-critical/20 text-critical border-critical/40",
};

export function riskLevelClass(level: RiskLevel): string {
  return RISK_LEVEL_CLASSES[level];
}

/** High-severity risk levels require an extra acknowledgment gate (Step 4). */
export function isHighRisk(level: RiskLevel): boolean {
  return level === "HIGH" || level === "CRITICAL";
}

export function formatNumber(value: number, precision = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}
