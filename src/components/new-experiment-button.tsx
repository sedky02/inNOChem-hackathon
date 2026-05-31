"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNewSession } from "@/lib/api";
import { newSessionId } from "@/lib/mocks/sessions";
import { useExperimentStore } from "@/lib/stores/experiment-store";
import { cn } from "@/lib/utils";

export function NewExperimentButton({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg" | "sm";
}) {
  const router = useRouter();
  const initSession = useExperimentStore((s) => s.initSession);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const id = newSessionId("EXPR");
    try {
      await createNewSession(id);
      initSession(id, "");
      router.push(`/experiment/${id}/step-1`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={start}
      disabled={loading}
      size={size}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      New Experiment
    </Button>
  );
}
