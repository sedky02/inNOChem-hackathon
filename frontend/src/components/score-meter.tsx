"use client";

import { RadialGauge } from "@/components/charts/radial-gauge";
import { scoreColorHex } from "@/lib/domain";

export function ScoreMeter({
  score,
  label,
  size = 132,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const color = scoreColorHex(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <RadialGauge value={score} color={color} size={size}>
        <div className="text-center">
          <div
            className="font-display text-3xl font-bold leading-none"
            style={{ color }}
          >
            {score}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            / 100
          </div>
        </div>
      </RadialGauge>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
