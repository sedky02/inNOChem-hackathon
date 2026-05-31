"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { StepProgressBar } from "@/components/layout/step-progress-bar";
import { ModeBadge } from "@/components/mode-badge";
import { Button } from "@/components/ui/button";
import { useExperimentStore } from "@/lib/stores/experiment-store";

export function WizardShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const sessionId = useExperimentStore((s) => s.sessionId);
  const dyeName = useExperimentStore((s) => s.dyeName);
  const selectedMode = useExperimentStore((s) => s.selectedMode);
  const initSession = useExperimentStore((s) => s.initSession);

  // Keep the store bound to the route's session id (resets on a new experiment).
  useEffect(() => {
    if (params.id && sessionId !== params.id) {
      initSession(params.id, "");
    }
  }, [params.id, sessionId, initSession]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm text-muted-foreground">
            Session
          </span>
          <span className="font-display text-sm font-semibold">
            {dyeName || params.id}
          </span>
          {selectedMode && <ModeBadge mode={selectedMode} />}
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-success" /> Auto-saved
        </span>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card/50 px-3 py-2 print:hidden">
        <StepProgressBar />
      </div>

      {children}
    </div>
  );
}
