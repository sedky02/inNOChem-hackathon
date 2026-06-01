import type { OptimizeRequest, ScreenRequest } from "@/lib/types";

/** Centralized, type-safe query keys for TanStack Query. */
export const queryKeys = {
  sessions: {
    all: ["sessions"] as const,
    list: () => ["sessions", "list"] as const,
    detail: (id: string) => ["sessions", id] as const,
  },
  dashboard: {
    aggregate: ["dashboard", "aggregate"] as const,
  },
  screening: (req: ScreenRequest) => ["screening", req.smiles, req.dye_name] as const,
  optimize: (req: OptimizeRequest) =>
    [
      "optimize",
      req.optimization_mode,
      req.manual_overrides ?? null,
      req.chemical_profile.compatibility_score,
    ] as const,
};
