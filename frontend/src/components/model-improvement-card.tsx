import { TrendingUp } from "lucide-react";
import type { AdaptResponse } from "@/lib/types";

export function ModelImprovementCard({
  confidence,
}: {
  confidence: AdaptResponse["model_confidence"];
}) {
  const deltaPct = (confidence.delta * 100).toFixed(1);
  return (
    <div className="flex items-center gap-4 rounded-lg border border-success/30 bg-success/10 p-4">
      <span className="grid size-10 place-items-center rounded-md bg-success/20 text-success">
        <TrendingUp className="size-5" />
      </span>
      <div>
        <div className="text-sm font-medium text-success">
          Model recalibrated · +{deltaPct}% accuracy
        </div>
        <div className="text-xs text-muted-foreground">
          Confidence {(confidence.previous * 100).toFixed(1)}% →{" "}
          <span className="font-semibold text-foreground">
            {(confidence.current * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
