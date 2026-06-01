"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KineticDataPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const KS_COLOR = "#10b981";
const CONC_COLOR = "#06b6d4";

function KineticTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const ks = payload.find((p) => p.dataKey === "ks")?.value;
  const conc = payload.find((p) => p.dataKey === "dye_concentration")?.value;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-mono text-muted-foreground">{label} min</div>
      <div className="flex items-center gap-1.5" style={{ color: KS_COLOR }}>
        <span className="size-2 rounded-full" style={{ background: KS_COLOR }} />
        K/S strength: <span className="font-mono font-semibold">{ks}</span>
      </div>
      <div className="flex items-center gap-1.5" style={{ color: CONC_COLOR }}>
        <span className="size-2 rounded-full" style={{ background: CONC_COLOR }} />
        Dye conc.: <span className="font-mono font-semibold">{conc} mg/L</span>
      </div>
    </div>
  );
}

export function KineticChart({
  data,
  isUpdating,
}: {
  data: KineticDataPoint[];
  isUpdating?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background/40 p-3 transition-shadow",
        isUpdating && "shadow-glow",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: KS_COLOR }}>
            <span className="size-2 rounded-full" style={{ background: KS_COLOR }} />
            Color strength (K/S)
          </span>
          <span className="flex items-center gap-1.5" style={{ color: CONC_COLOR }}>
            <span className="size-2 rounded-full" style={{ background: CONC_COLOR }} />
            Dye conc. (mg/L)
          </span>
        </div>
        {isUpdating && (
          <span className="animate-pulse text-xs text-muted-foreground">
            updating…
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            label={{
              value: "Time (min)",
              position: "insideBottom",
              offset: -4,
              fontSize: 11,
              fill: "#71717a",
            }}
          />
          <YAxis
            yAxisId="left"
            stroke={KS_COLOR}
            fontSize={11}
            tickLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={CONC_COLOR}
            fontSize={11}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<KineticTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ks"
            stroke={KS_COLOR}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="dye_concentration"
            stroke={CONC_COLOR}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
