import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Explainability,
  FabricProfile,
  OptimizationMode,
  OptimizeResponse,
  ProcessOverrides,
  ProcessParameters,
  RiskAssessment,
  ScenarioSummary,
  ScreeningResult,
  SimulationOutputs,
  SustainabilityMetrics,
} from "@/lib/types";

interface ExperimentState {
  // Session
  sessionId: string | null;
  sessionName: string;
  dyeName: string;

  // Wizard gates
  currentStep: number;
  completedSteps: number[];

  // Step 1 — molecular screening
  fabricProfile: FabricProfile | null;
  screeningResult: ScreeningResult | null;
  step1Confirmed: boolean;

  // Step 2 — scenarios
  scenarios: Record<OptimizationMode, ScenarioSummary> | null;
  selectedMode: OptimizationMode | null;

  // Step 3 — kinetic simulation (latest optimize result + overrides)
  recommendedParameters: ProcessParameters | null;
  manualOverrides: ProcessOverrides;
  simulationOutputs: SimulationOutputs | null;
  parametersConfirmed: boolean;

  // Step 4 — risk & explainability
  riskAssessment: RiskAssessment | null;
  explainability: Explainability | null;
  sustainabilityMetrics: SustainabilityMetrics | null;
  safetyAcknowledged: boolean;
  engineerNotes: string;

  // Step 5 — output
  feedbackSubmitted: boolean;
  // Backend-issued seal (real-backend path); null on the mock path.
  serverVerification: { verification_hash: string; verified_at: string } | null;

  // Actions
  initSession: (id: string, dyeName: string) => void;
  setFabricProfile: (p: FabricProfile) => void;
  setScreeningResult: (r: ScreeningResult, dyeName: string) => void;
  confirmStep1: () => void;
  applyOptimizeResult: (res: OptimizeResponse) => void;
  setSelectedMode: (m: OptimizationMode) => void;
  setManualOverrides: (o: ProcessOverrides) => void;
  resetOverrides: () => void;
  confirmParameters: () => void;
  acknowledgeSafety: (ack: boolean, notes: string) => void;
  setServerVerification: (
    v: { verification_hash: string; verified_at: string } | null,
  ) => void;
  setFeedbackSubmitted: (v: boolean) => void;
  goToStep: (n: number) => void;
  markStepComplete: (n: number) => void;
  resetExperiment: () => void;
}

const initialState = {
  sessionId: null,
  sessionName: "",
  dyeName: "",
  currentStep: 1,
  completedSteps: [] as number[],
  fabricProfile: null,
  screeningResult: null,
  step1Confirmed: false,
  scenarios: null,
  selectedMode: null,
  recommendedParameters: null,
  manualOverrides: {} as ProcessOverrides,
  simulationOutputs: null,
  parametersConfirmed: false,
  serverVerification: null,
  riskAssessment: null,
  explainability: null,
  sustainabilityMetrics: null,
  safetyAcknowledged: false,
  engineerNotes: "",
  feedbackSubmitted: false,
};

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initSession: (id, dyeName) => {
        // Starting a different session wipes prior progress.
        if (get().sessionId !== id) {
          set({ ...initialState, sessionId: id, dyeName, sessionName: dyeName });
        }
      },

      setFabricProfile: (fabricProfile) => set({ fabricProfile }),

      setScreeningResult: (screeningResult, dyeName) =>
        set({ screeningResult, dyeName, sessionName: dyeName }),

      confirmStep1: () =>
        set((s) => ({
          step1Confirmed: true,
          completedSteps: addStep(s.completedSteps, 1),
        })),

      applyOptimizeResult: (res) =>
        set({
          recommendedParameters: res.recommended_parameters,
          simulationOutputs: res.simulation_outputs,
          sustainabilityMetrics: res.sustainability_metrics,
          riskAssessment: res.risk_assessment,
          explainability: res.explainability,
          scenarios: res.scenarios,
        }),

      setSelectedMode: (selectedMode) =>
        set((s) => ({
          selectedMode,
          manualOverrides: {}, // new mode → drop manual tweaks
          completedSteps: addStep(s.completedSteps, 2),
        })),

      setManualOverrides: (o) =>
        set((s) => ({ manualOverrides: { ...s.manualOverrides, ...o } })),

      resetOverrides: () => set({ manualOverrides: {} }),

      confirmParameters: () =>
        set((s) => ({
          parametersConfirmed: true,
          completedSteps: addStep(s.completedSteps, 3),
        })),

      acknowledgeSafety: (safetyAcknowledged, engineerNotes) =>
        set((s) => ({
          safetyAcknowledged,
          engineerNotes,
          completedSteps: safetyAcknowledged
            ? addStep(s.completedSteps, 4)
            : s.completedSteps.filter((n) => n !== 4),
        })),

      setServerVerification: (serverVerification) => set({ serverVerification }),

      setFeedbackSubmitted: (feedbackSubmitted) => set({ feedbackSubmitted }),

      goToStep: (currentStep) => set({ currentStep }),

      markStepComplete: (n) =>
        set((s) => ({ completedSteps: addStep(s.completedSteps, n) })),

      resetExperiment: () => set({ ...initialState }),
    }),
    {
      name: "greendye-experiment",
      // sessionStorage so a fresh tab starts clean, but reloads resume.
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const v = window.sessionStorage.getItem(name);
          return v ? JSON.parse(v) : null;
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          window.sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          window.sessionStorage.removeItem(name);
        },
      },
    },
  ),
);

function addStep(steps: number[], n: number): number[] {
  return steps.includes(n) ? steps : [...steps, n].sort((a, b) => a - b);
}

/** Effective parameters = manual overrides layered over AI recommendation. */
export function effectiveParameters(
  s: Pick<ExperimentState, "recommendedParameters" | "manualOverrides">,
): ProcessParameters | null {
  if (!s.recommendedParameters) return null;
  return { ...s.recommendedParameters, ...s.manualOverrides };
}

/** Whether a manual override differs from the AI recommendation. */
export function hasManualOverrides(
  s: Pick<ExperimentState, "manualOverrides">,
): boolean {
  return Object.keys(s.manualOverrides).length > 0;
}
