"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { NewExperimentButton } from "@/components/new-experiment-button";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { ModeBadge } from "@/components/mode-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSessions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function ExperimentsPage() {
  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: fetchSessions,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Experiments
          </h1>
          <p className="text-sm text-muted-foreground">
            Resume an in-progress run or start a new one.
          </p>
        </div>
        <NewExperimentButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))
          : sessions.data?.map((s) => (
              <Card key={s.id} className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{s.dye_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {s.id}
                      </div>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    {s.mode ? (
                      <ModeBadge mode={s.mode} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not optimized
                      </span>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/experiment/${s.id}/step-1`}>
                        {s.status === "complete" ? "View" : "Resume"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
