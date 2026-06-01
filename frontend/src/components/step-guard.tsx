"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when a wizard step is opened before its prerequisite data exists
 *  (e.g. a hard refresh into a later step on a fresh session). */
export function StepGuard({
  message,
  backStep,
}: {
  message: string;
  backStep: string;
}) {
  const params = useParams<{ id: string }>();
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="gap-1.5">
        <Link href={`/experiment/${params.id}/${backStep}`}>
          <ArrowLeft className="size-4" /> Go back
        </Link>
      </Button>
    </div>
  );
}
