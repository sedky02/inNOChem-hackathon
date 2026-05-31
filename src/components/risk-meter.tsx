"use client";

import { RadialGauge } from "@/components/charts/radial-gauge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { riskProbabilityHex } from "@/lib/domain";

export function RiskMeter({
  label,
  probability,
  confidence,
  description,
}: {
  label: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  description: string;
}) {
  const pct = Math.round(probability * 100);
  const color = riskProbabilityHex(probability);
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground">
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-56 text-xs">
            {description}
          </TooltipContent>
        </Tooltip>
      </div>
      <RadialGauge value={pct} color={color} size={108} stroke={9}>
        <div className="text-center">
          <div
            className="font-display text-2xl font-bold leading-none"
            style={{ color }}
          >
            {pct}%
          </div>
        </div>
      </RadialGauge>
      <div className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        {Math.round(confidence * 100)}% confidence
      </div>
    </div>
  );
}
