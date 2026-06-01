"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, AlertCircle } from "lucide-react";

import { ScenarioCard } from "@/components/scenario-card";
import { StepGuard } from "@/components/step-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MODE_ORDER } from "@/lib/constants";
import { optimizeProcess } from "@/lib/api";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import type { OptimizationMode, OptimizeRequest } from "@/lib/types";

export default function Step2Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const screeningResult = useExperimentStore((s) => s.screeningResult);
  const fabricProfile = useExperimentStore((s) => s.fabricProfile);
  const scenarios = useExperimentStore((s) => s.scenarios);
  const selectedMode = useExperimentStore((s) => s.selectedMode);
  const applyOptimizeResult = useExperimentStore((s) => s.applyOptimizeResult);
  const setSelectedMode = useExperimentStore((s) => s.setSelectedMode);

  const ranInitial = useRef(false);

  const optimizeMut = useMutation({
    mutationFn: ({ mode }: { mode: OptimizationMode; select: boolean }) => {
      const req: OptimizeRequest = {
        fabric_profile: fabricProfile!,
        chemical_profile: screeningResult!,
        optimization_mode: mode,
        session_id: params.id,
      };
      return optimizeProcess(req);
    },
    onSuccess: (res, vars) => {
      applyOptimizeResult(res);
      if (vars.select) setSelectedMode(vars.mode);
    },
  });

  // Fetch the three scenario presets once on entry.
  useEffect(() => {
    if (!scenarios && !ranInitial.current && screeningResult && fabricProfile) {
      ranInitial.current = true;
      optimizeMut.mutate({ mode: "balanced", select: false });
    }
  }, [scenarios, screeningResult, fabricProfile, optimizeMut]);

  if (!screeningResult || !fabricProfile) {
    return (
      <StepGuard
        backStep="step-1"
        message="Screen a dye molecule first — scenarios are generated from its chemical profile."
      />
    );
  }

  const loadingScenarios = !scenarios && optimizeMut.isPending;
  const failedScenarios = !scenarios && optimizeMut.isError;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Process Scenarios
        </h1>
        <p className="text-sm text-muted-foreground">
          Three AI-optimized strategies balance color quality against
          environmental and operational cost. Pick one to simulate.
        </p>
      </header>

      {failedScenarios ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t generate scenarios.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => optimizeMut.mutate({ mode: "balanced", select: false })}
          >
            Retry
          </Button>
        </div>
      ) : loadingScenarios ? (
        <div className="grid gap-4 md:grid-cols-3">
          {MODE_ORDER.map((m) => (
            <Skeleton key={m} className="h-96 rounded-lg" />
          ))}
        </div>
      ) : scenarios ? (
        <div className="grid gap-4 md:grid-cols-3">
          {MODE_ORDER.map((mode) => (
            <ScenarioCard
              key={mode}
              summary={scenarios[mode]}
              selected={selectedMode === mode}
              busy={
                optimizeMut.isPending && optimizeMut.variables?.mode === mode
              }
              onSelect={() => optimizeMut.mutate({ mode, select: true })}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {selectedMode
            ? "Strategy selected — continue to fine-tune in the simulator."
            : "Select a strategy to continue."}
        </p>
        <Button
          size="lg"
          className="gap-2"
          disabled={!selectedMode || optimizeMut.isPending}
          onClick={() => router.push(`/experiment/${params.id}/step-3`)}
        >
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
