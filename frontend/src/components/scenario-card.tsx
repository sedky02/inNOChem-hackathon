"use client";

import { Check, Leaf, Scale, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODE_META } from "@/lib/constants";
import type { OptimizationMode, ScenarioSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<OptimizationMode, LucideIcon> = {
  eco: Leaf,
  balanced: Scale,
  performance: Zap,
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

export function ScenarioCard({
  summary,
  selected,
  onSelect,
  busy,
}: {
  summary: ScenarioSummary;
  selected: boolean;
  onSelect: () => void;
  busy?: boolean;
}) {
  const meta = MODE_META[summary.mode];
  const Icon = ICONS[summary.mode];
  const { parameters: p } = summary;

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4 p-5 transition-all",
        selected ? "ring-2" : "hover:border-foreground/20",
      )}
      style={
        selected
          ? ({
              borderColor: meta.accent,
              boxShadow: `0 0 24px color-mix(in oklab, ${meta.accent} 18%, transparent)`,
              "--tw-ring-color": meta.accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      {selected && (
        <span
          className="absolute right-4 top-4 grid size-6 place-items-center rounded-full text-background"
          style={{ background: meta.accent }}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className="grid size-9 place-items-center rounded-md"
          style={{
            color: meta.accent,
            background: `color-mix(in oklab, ${meta.accent} 14%, transparent)`,
          }}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <div className="font-display text-base font-semibold">
            {meta.label}
          </div>
        </div>
      </div>

      <p className="min-h-10 text-xs text-muted-foreground">{meta.blurb}</p>

      <div className="rounded-md border border-border bg-background/40 px-3 py-1.5">
        <Row label="Temperature" value={`${p.temperature} °C`} />
        <Row label="Pressure" value={`${p.pressure} bar`} />
        <Row label="Cycle time" value={`${p.time} min`} />
        <Row label="Flow rate" value={`${p.flow_rate} kg/min`} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <div className="text-xs text-muted-foreground">K/S index</div>
          <div className="font-display text-lg font-bold">
            {summary.ks_index}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ±{summary.ks_variance}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">CO₂ reduction</div>
          <div className="font-display text-lg font-bold text-primary">
            −{summary.co2_reduction}%
          </div>
        </div>
      </div>

      <Button
        onClick={onSelect}
        disabled={busy}
        variant={selected ? "default" : "outline"}
        className="mt-auto w-full"
      >
        {selected ? "Selected" : "Select"}
      </Button>
    </Card>
  );
}
