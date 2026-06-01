"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExplainabilityEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const POS = "#ef4444"; // pushes the value up
const NEG = "#3b82f6"; // pulls the value down

export function ShapForceChart({
  entry,
  unit,
}: {
  entry: ExplainabilityEntry;
  unit: string;
}) {
  const sorted = [...entry.shap_values].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value),
  );
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.value)), 0.001);

  return (
    <div className="space-y-4">
      {/* Baseline → predicted summary */}
      <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-2.5 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Base value</div>
          <div className="font-mono font-semibold">
            {entry.baseline} {unit}
          </div>
        </div>
        <div className="flex-1 px-4 text-center text-xs text-muted-foreground">
          feature contributions →
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Predicted</div>
          <div className="font-mono font-semibold text-primary">
            {entry.predicted} {unit}
          </div>
        </div>
      </div>

      {/* Diverging contribution bars */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[130px_1fr_60px] items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Feature</span>
          <span className="text-center">decreases ← → increases</span>
          <span className="text-right">Δ</span>
        </div>
        {sorted.map((s) => {
          const positive = s.value >= 0;
          const widthPct = (Math.abs(s.value) / maxAbs) * 50;
          return (
            <Tooltip key={s.feature}>
              <TooltipTrigger asChild>
                <div className="grid grid-cols-[130px_1fr_60px] items-center gap-2">
                  <span className="truncate text-sm">{s.feature}</span>
                  <div className="relative h-5 rounded bg-muted/40">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className={cn("absolute inset-y-0.5 rounded")}
                      style={{
                        background: positive ? POS : NEG,
                        left: positive ? "50%" : `${50 - widthPct}%`,
                        width: `${widthPct}%`,
                      }}
                    />
                  </div>
                  <span
                    className="text-right font-mono text-xs font-semibold"
                    style={{ color: positive ? POS : NEG }}
                  >
                    {positive ? "+" : ""}
                    {s.value}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-60 text-xs">
                <span className="font-semibold">{s.feature}: </span>
                {s.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: POS }} />
          increases parameter
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: NEG }} />
          decreases parameter
        </span>
      </div>
    </div>
  );
}
