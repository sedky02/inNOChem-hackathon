import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<SessionStatus, { label: string; className: string }> = {
  complete: { label: "Complete", className: "bg-success/15 text-success border-success/30" },
  in_progress: { label: "In progress", className: "bg-balanced/15 text-balanced border-balanced/30" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-medium", meta.className)}>
      {meta.label}
    </Badge>
  );
}
