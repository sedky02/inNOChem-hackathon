"use client";

import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PARAM_ORDER, PARAM_RANGES } from "@/lib/constants";
import type { ExplainParameter, ProcessParameters } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ParameterSliderPanel({
  values,
  recommended,
  onChange,
  locked = false,
}: {
  values: ProcessParameters;
  recommended: ProcessParameters;
  onChange: (param: ExplainParameter, value: number) => void;
  locked?: boolean;
}) {
  return (
    <div className="space-y-5">
      {PARAM_ORDER.map((param) => {
        const range = PARAM_RANGES[param];
        const value = values[param];
        const isOverridden = value !== recommended[param];
        return (
          <div key={param} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{range.label}</label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-sm font-semibold",
                    isOverridden
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-border bg-background/60",
                  )}
                >
                  {value} {range.unit}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={locked || !isOverridden}
                  title="Reset to AI recommendation"
                  onClick={() => onChange(param, recommended[param])}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
            <Slider
              value={[value]}
              min={range.min}
              max={range.max}
              step={range.step}
              disabled={locked}
              onValueChange={([v]) => onChange(param, v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{range.min}</span>
              <span>{range.max}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
