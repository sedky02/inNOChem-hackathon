"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Activity, Sparkles, RotateCcw } from "lucide-react";

import { KineticChart } from "@/components/charts/kinetic-chart";
import { ParameterSliderPanel } from "@/components/parameter-slider-panel";
import { ModeBadge } from "@/components/mode-badge";
import { StepGuard } from "@/components/step-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { optimizeProcess } from "@/lib/api";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import type { ExplainParameter, ProcessParameters } from "@/lib/types";

export default function Step3Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const screeningResult = useExperimentStore((s) => s.screeningResult);
  const fabricProfile = useExperimentStore((s) => s.fabricProfile);
  const selectedMode = useExperimentStore((s) => s.selectedMode);
  const recommendedParameters = useExperimentStore((s) => s.recommendedParameters);
  const manualOverrides = useExperimentStore((s) => s.manualOverrides);
  const simulationOutputs = useExperimentStore((s) => s.simulationOutputs);
  const setManualOverrides = useExperimentStore((s) => s.setManualOverrides);
  const resetOverrides = useExperimentStore((s) => s.resetOverrides);
  const applyOptimizeResult = useExperimentStore((s) => s.applyOptimizeResult);
  const confirmParameters = useExperimentStore((s) => s.confirmParameters);

  const ready =
    screeningResult && fabricProfile && selectedMode && recommendedParameters;

  const [values, setValues] = useState<ProcessParameters>(() => ({
    ...(recommendedParameters ?? {
      pressure: 250,
      temperature: 130,
      time: 65,
      flow_rate: 1.1,
    }),
    ...manualOverrides,
  }));

  const optimizeMut = useMutation({
    mutationFn: (overrides: ProcessParameters) =>
      optimizeProcess({
        fabric_profile: fabricProfile!,
        chemical_profile: screeningResult!,
        optimization_mode: selectedMode!,
        manual_overrides: overrides,
        session_id: params.id,
      }),
    onSuccess: (res) => applyOptimizeResult(res),
  });

  const runOptimize = useDebouncedCallback((vals: ProcessParameters) => {
    optimizeMut.mutate(vals);
  }, 500);

  if (!ready) {
    return (
      <StepGuard
        backStep="step-2"
        message="Choose an optimization strategy before entering the simulator."
      />
    );
  }

  const recommended = recommendedParameters!;
  const hasOverrides = Object.keys(manualOverrides).length > 0;

  function handleChange(param: ExplainParameter, value: number) {
    const next = { ...values, [param]: value };
    setValues(next);
    setManualOverrides({ [param]: value });
    runOptimize(next);
  }

  function handleResetAll() {
    setValues({ ...recommended });
    resetOverrides();
    runOptimize({ ...recommended });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Kinetic Simulation
          </h1>
          <p className="text-sm text-muted-foreground">
            Override the AI recommendation and watch the digital twin respond in
            real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMode && <ModeBadge mode={selectedMode} />}
          {hasOverrides ? (
            <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
              Manual override active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="size-3" /> AI recommended
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <KineticChart
            data={simulationOutputs?.kinetic_curve ?? []}
            isUpdating={optimizeMut.isPending}
          />
          {simulationOutputs && (
            <div className="grid grid-cols-3 gap-3">
              <OutputStat
                label="Dye uptake"
                value={`${simulationOutputs.dye_uptake}%`}
              />
              <OutputStat
                label="Color (K/S)"
                value={`${simulationOutputs.color_intensity}`}
              />
              <OutputStat
                label="Efficiency"
                value={`${simulationOutputs.efficiency}%`}
              />
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Parameters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={!hasOverrides}
              onClick={handleResetAll}
            >
              <RotateCcw className="size-3.5" /> Reset all
            </Button>
          </CardHeader>
          <CardContent>
            <ParameterSliderPanel
              values={values}
              recommended={recommended}
              onChange={handleChange}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          Confirm to lock these parameters and run the safety review.
        </p>
        <Button
          size="lg"
          className="gap-2"
          disabled={optimizeMut.isPending}
          onClick={() => {
            confirmParameters();
            router.push(`/experiment/${params.id}/step-4`);
          }}
        >
          Confirm Parameters <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function OutputStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
