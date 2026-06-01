import { Leaf, Scale, Zap, type LucideIcon } from "lucide-react";
import { MODE_META } from "@/lib/constants";
import type { OptimizationMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<OptimizationMode, LucideIcon> = {
  eco: Leaf,
  balanced: Scale,
  performance: Zap,
};

export function ModeBadge({
  mode,
  className,
}: {
  mode: OptimizationMode;
  className?: string;
}) {
  const meta = MODE_META[mode];
  const Icon = ICONS[mode];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{
        color: meta.accent,
        borderColor: `color-mix(in oklab, ${meta.accent} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${meta.accent} 12%, transparent)`,
      }}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}
