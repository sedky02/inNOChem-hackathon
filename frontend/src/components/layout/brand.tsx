import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary shadow-glow">
        <Leaf className="size-4.5" strokeWidth={2} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-tight text-foreground">
            GreenDye<span className="text-primary"> Twin</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            scCO₂ Digital Twin
          </div>
        </div>
      )}
    </div>
  );
}
