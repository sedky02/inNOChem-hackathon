import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { compatibilityLabel } from "@/lib/domain";
import { cn } from "@/lib/utils";

const META = {
  COMPATIBLE: {
    icon: CheckCircle2,
    className: "bg-success/15 text-success border-success/30",
  },
  MARGINAL: {
    icon: AlertTriangle,
    className: "bg-warning/15 text-warning border-warning/30",
  },
  INCOMPATIBLE: {
    icon: XCircle,
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
} as const;

export function CompatibilityBadge({ score }: { score: number }) {
  const label = compatibilityLabel(score);
  const { icon: Icon, className } = META[label];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
