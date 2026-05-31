"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  Droplets,
  Leaf,
  Recycle,
  Zap,
} from "lucide-react";

import { AdaptiveFeedbackForm } from "@/components/adaptive-feedback-form";
import { ExportToolbar } from "@/components/export-toolbar";
import { SustainabilityMetricCard } from "@/components/sustainability-metric-card";
import { ModeBadge } from "@/components/mode-badge";
import { StepGuard } from "@/components/step-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewExperimentButton } from "@/components/new-experiment-button";
import { sealConfig, patchSession } from "@/lib/api";
import { formatNumber } from "@/lib/domain";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import type { ProcessParameters } from "@/lib/types";

export default function Step5Page() {
  const params = useParams<{ id: string }>();

  const sessionId = useExperimentStore((s) => s.sessionId);
  const dyeName = useExperimentStore((s) => s.dyeName);
  const selectedMode = useExperimentStore((s) => s.selectedMode);
  const recommendedParameters = useExperimentStore((s) => s.recommendedParameters);
  const manualOverrides = useExperimentStore((s) => s.manualOverrides);
  const sustainability = useExperimentStore((s) => s.sustainabilityMetrics);
  const riskAssessment = useExperimentStore((s) => s.riskAssessment);
  const safetyAcknowledged = useExperimentStore((s) => s.safetyAcknowledged);
  const feedbackSubmitted = useExperimentStore((s) => s.feedbackSubmitted);
  const setFeedbackSubmitted = useExperimentStore((s) => s.setFeedbackSubmitted);

  const ready =
    selectedMode &&
    recommendedParameters &&
    sustainability &&
    safetyAcknowledged;

  const effective: ProcessParameters | null = recommendedParameters
    ? { ...recommendedParameters, ...manualOverrides }
    : null;

  // Seal the manifest once on mount (stable hash/timestamp).
  const [manifest] = useState(() =>
    ready && effective && selectedMode
      ? sealConfig({
          session_id: sessionId ?? params.id,
          dye_name: dyeName || params.id,
          mode: selectedMode,
          parameters: effective,
          engineer_ack: safetyAcknowledged,
        })
      : null,
  );

  // Mark the session complete in the (mock) backend.
  const marked = useRef(false);
  useEffect(() => {
    if (ready && !marked.current) {
      marked.current = true;
      void patchSession(params.id, {
        status: "complete",
        mode: selectedMode,
        risk_level: riskAssessment?.overall_risk ?? null,
        dye_name: dyeName || undefined,
      });
    }
  }, [ready, params.id, selectedMode, riskAssessment, dyeName]);

  if (!ready || !effective || !manifest) {
    return (
      <StepGuard
        backStep="step-4"
        message="Complete the safety review before finalizing the configuration."
      />
    );
  }

  const exportPayload = {
    manifest,
    parameters: effective,
    sustainability,
    risk_level: riskAssessment?.overall_risk,
  };
  const csvRow = {
    session_id: manifest.session_id,
    dye_name: manifest.dye_name,
    mode: manifest.mode,
    pressure_bar: effective.pressure,
    temperature_c: effective.temperature,
    time_min: effective.time,
    flow_kg_min: effective.flow_rate,
    water_savings_pct: sustainability.water_savings,
    energy_reduction_pct: sustainability.energy_reduction,
    carbon_saved_kg: sustainability.carbon_saved,
    e_factor: sustainability.e_factor,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Configuration Output
        </h1>
        <p className="text-sm text-muted-foreground">
          Your validated, signed process configuration — ready for the factory
          floor.
        </p>
      </header>

      {/* Validated manifest */}
      <Card className="border-success/30 shadow-glow">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-5 text-success" /> Validated &amp;
              Sealed
            </CardTitle>
            <ModeBadge mode={manifest.mode} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ManifestRow label="Session" value={manifest.session_id} mono />
            <ManifestRow label="Dye" value={manifest.dye_name} />
            <ManifestRow
              label="Sealed at"
              value={new Date(manifest.timestamp).toLocaleString()}
            />
            <ManifestRow
              label="Verification hash"
              value={manifest.verification_hash}
              mono
            />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-background/40 p-4 sm:grid-cols-4">
            <Param label="Pressure" value={`${effective.pressure} bar`} />
            <Param label="Temperature" value={`${effective.temperature} °C`} />
            <Param label="Cycle time" value={`${effective.time} min`} />
            <Param label="Flow rate" value={`${effective.flow_rate} kg/min`} />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BadgeCheck className="size-3.5 text-success" />
            Signature{" "}
            <span className="font-mono text-foreground">
              {manifest.signature}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sustainability impact */}
      <div>
        <h2 className="mb-3 font-display text-base font-semibold">
          Sustainability Impact
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SustainabilityMetricCard
            icon={Droplets}
            label="Water saved"
            value={`${formatNumber(sustainability.water_savings, 1)}%`}
            accentClass="bg-brand-cyan/15 text-brand-cyan"
          />
          <SustainabilityMetricCard
            icon={Zap}
            label="Energy reduction"
            value={`${formatNumber(sustainability.energy_reduction, 1)}%`}
            accentClass="bg-warning/15 text-warning"
          />
          <SustainabilityMetricCard
            icon={Leaf}
            label="Carbon saved"
            value={`${formatNumber(sustainability.carbon_saved, 2)} kg`}
            accentClass="bg-primary/15 text-primary"
          />
          <SustainabilityMetricCard
            icon={Recycle}
            label="E-Factor"
            value={`${formatNumber(sustainability.e_factor, 3)}`}
            accentClass="bg-success/15 text-success"
          />
        </div>
      </div>

      {/* Export */}
      <Card className="print:hidden">
        <CardContent className="py-4">
          <ExportToolbar
            baseName={manifest.session_id}
            payload={exportPayload}
            csvRow={csvRow}
          />
        </CardContent>
      </Card>

      {/* Adaptive feedback */}
      <div className="print:hidden">
      <AdaptiveFeedbackForm
        sessionId={manifest.session_id}
        submitted={feedbackSubmitted}
        suggested={{
          actual_ks: sustainability ? effective.pressure / 14 : 0,
          actual_pressure: effective.pressure,
          actual_temperature: effective.temperature,
          actual_flow_rate: effective.flow_rate,
        }}
        onSubmitted={() => setFeedbackSubmitted(true)}
      />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 print:hidden">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
        <NewExperimentButton />
      </div>
    </div>
  );
}

function ManifestRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm font-medium" : "text-sm font-medium"}>
        {value}
      </div>
    </div>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
