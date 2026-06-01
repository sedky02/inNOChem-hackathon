"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { WIZARD_STEPS } from "@/lib/constants";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import { cn } from "@/lib/utils";

export function StepProgressBar() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const completedSteps = useExperimentStore((s) => s.completedSteps);

  const currentStep =
    WIZARD_STEPS.find((s) => pathname.endsWith(s.slug))?.step ?? 1;

  function isAccessible(step: number): boolean {
    if (step === 1) return true;
    if (completedSteps.includes(step) || step === currentStep) return true;
    // Accessible once every prior step's gate has cleared.
    return Array.from({ length: step - 1 }, (_, i) => i + 1).every((n) =>
      completedSteps.includes(n),
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {WIZARD_STEPS.map((s, idx) => {
        const completed = completedSteps.includes(s.step);
        const active = s.step === currentStep;
        const accessible = isAccessible(s.step);
        const href = `/experiment/${params.id}/${s.slug}`;

        const node = (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active && "bg-primary/10 text-primary",
              !active && accessible && "text-foreground hover:bg-accent",
              !accessible && "text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                completed && "border-primary bg-primary text-primary-foreground",
                active && !completed && "border-primary text-primary",
                !active && !completed && accessible && "border-border text-muted-foreground",
                !accessible && "border-border/60",
              )}
            >
              {completed ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : accessible ? (
                s.step
              ) : (
                <Lock className="size-3" />
              )}
            </span>
            <span className="hidden whitespace-nowrap font-medium sm:inline">
              {s.label}
            </span>
          </div>
        );

        return (
          <div key={s.step} className="flex items-center">
            {accessible && !active ? (
              <Link href={href}>{node}</Link>
            ) : (
              node
            )}
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-0.5 h-px w-4 shrink-0 sm:w-6",
                  completed ? "bg-primary/50" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
