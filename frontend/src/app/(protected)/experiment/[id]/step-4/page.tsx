"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Brain, Loader2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { USE_MOCKS } from "@/lib/api/client";
import { verifyBackend } from "@/lib/api/backend";

import { RiskMeter } from "@/components/risk-meter";
import { ShapForceChart } from "@/components/charts/shap-force-chart";
import { StepGuard } from "@/components/step-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PARAM_ORDER,
  PARAM_RANGES,
  RISK_COMPONENT_META,
  RISK_ORDER,
} from "@/lib/constants";
import { isHighRisk, riskLevelClass } from "@/lib/domain";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import type { ExplainParameter } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Step4Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const riskAssessment = useExperimentStore((s) => s.riskAssessment);
  const explainability = useExperimentStore((s) => s.explainability);
  const storedAck = useExperimentStore((s) => s.safetyAcknowledged);
  const storedNotes = useExperimentStore((s) => s.engineerNotes);
  const acknowledgeSafety = useExperimentStore((s) => s.acknowledgeSafety);
  const setServerVerification = useExperimentStore((s) => s.setServerVerification);

  const [shapParam, setShapParam] = useState<ExplainParameter>("pressure");
  const [checked, setChecked] = useState(storedAck);
  const [notes, setNotes] = useState(storedNotes);
  const [proceeding, setProceeding] = useState(false);

  async function handleProceed() {
    // Real backend: seal the session server-side (human-in-the-loop gate) so
    // downstream feedback/export are accepted. Mock path: just advance.
    if (!USE_MOCKS && riskAssessment) {
      setProceeding(true);
      try {
        const res = await verifyBackend(params.id, {
          acknowledged: true,
          engineer_notes: notes.trim() || "Risk profile reviewed and acknowledged.",
          overall_risk_at_sign: riskAssessment.overall_risk,
          force_override: true,
        });
        setServerVerification(res);
      } catch {
        setProceeding(false);
        toast.error("Verification failed", {
          description: "Could not seal the session on the server.",
        });
        return;
      }
      setProceeding(false);
    }
    router.push(`/experiment/${params.id}/step-5`);
  }

  if (!riskAssessment || !explainability) {
    return (
      <StepGuard
        backStep="step-3"
        message="Run the simulation and confirm parameters before the safety review."
      />
    );
  }

  const highRisk = isHighRisk(riskAssessment.overall_risk);
  const requireNotes = highRisk;
  const gateCleared = checked && (!requireNotes || notes.trim().length > 0);

  function persist(nextChecked: boolean, nextNotes: string) {
    const cleared =
      nextChecked && (!requireNotes || nextNotes.trim().length > 0);
    acknowledgeSafety(cleared, nextNotes);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Risk &amp; Explainability
          </h1>
          <p className="text-sm text-muted-foreground">
            Review automated failure probabilities and the reasoning behind each
            recommendation before approving.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-semibold",
            riskLevelClass(riskAssessment.overall_risk),
          )}
        >
          Overall: {riskAssessment.overall_risk}
        </span>
      </header>

      {/* Warning banner */}
      {riskAssessment.alerts.length > 0 && (
        <Alert variant={highRisk ? "destructive" : "default"}>
          <TriangleAlert className="size-4" />
          <AlertTitle>
            {highRisk ? "High-risk configuration" : "Advisories"}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {riskAssessment.alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Risk meters */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {RISK_ORDER.map((key) => {
          const c = riskAssessment.components[key];
          const meta = RISK_COMPONENT_META[key];
          return (
            <RiskMeter
              key={key}
              label={meta.label}
              description={meta.description}
              probability={c.probability}
              confidence={c.confidence}
            />
          );
        })}
      </div>

      {/* SHAP explainability */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-primary" /> SHAP Attribution
          </CardTitle>
          <Tabs
            value={shapParam}
            onValueChange={(v) => setShapParam(v as ExplainParameter)}
          >
            <TabsList>
              {PARAM_ORDER.map((p) => (
                <TabsTrigger key={p} value={p} className="text-xs capitalize">
                  {p.replace("_", " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ShapForceChart
            entry={explainability[shapParam]}
            unit={PARAM_RANGES[shapParam].unit}
          />
        </CardContent>
      </Card>

      {/* Safety verification gate */}
      <Card
        className={cn(
          highRisk && "border-destructive/40",
          gateCleared && "border-success/40",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {gateCleared ? (
              <ShieldCheck className="size-4 text-success" />
            ) : (
              <ShieldAlert className="size-4 text-warning" />
            )}
            Safety Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => {
                const next = v === true;
                setChecked(next);
                persist(next, notes);
              }}
              className="mt-0.5"
            />
            <span className="text-sm">
              I have reviewed and acknowledge the risk profile, and verify the
              structural safety of these parameters.
            </span>
          </label>

          {requireNotes && (
            <div className="space-y-1.5">
              <Label htmlFor="notes">
                Engineer notes{" "}
                <span className="text-destructive">(required for high risk)</span>
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Document the mitigations or rationale for proceeding…"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  persist(checked, e.target.value);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {gateCleared
            ? "Safety verified — proceed to the final configuration."
            : "Acknowledge the risk profile to proceed."}
        </p>
        <Button
          size="lg"
          className="gap-2"
          disabled={!gateCleared || proceeding}
          onClick={handleProceed}
        >
          {proceeding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Proceed to Output <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
