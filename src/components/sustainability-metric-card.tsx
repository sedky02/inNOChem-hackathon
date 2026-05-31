import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SustainabilityMetricCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md",
          accentClass,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}
