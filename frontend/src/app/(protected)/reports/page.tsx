"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowRight } from "lucide-react";

import { ModeBadge } from "@/components/mode-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSessions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function ReportsPage() {
  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: fetchSessions,
  });

  const reports = (sessions.data ?? []).filter((s) => s.status === "complete");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Finalized experiment reports, ready to export and audit.
        </p>
      </div>

      {sessions.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : reports.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((s) => (
            <Card key={s.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                    <FileText className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.dye_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {s.id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {s.mode && <ModeBadge mode={s.mode} />}
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={`/experiment/${s.id}/step-5`}>
                    Open report <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No completed reports yet.
        </div>
      )}
    </div>
  );
}
