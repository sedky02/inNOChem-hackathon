"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Droplets, Leaf, Zap, FlaskConical, AlertCircle } from "lucide-react";
import { NewExperimentButton } from "@/components/new-experiment-button";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { ModeBadge } from "@/components/mode-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchDashboardAggregate, fetchSessions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/domain";

export default function DashboardPage() {
  const aggregate = useQuery({
    queryKey: queryKeys.dashboard.aggregate,
    queryFn: fetchDashboardAggregate,
  });
  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: fetchSessions,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Your sustainable dyeing command center.
          </p>
        </div>
        <NewExperimentButton size="lg" />
      </div>

      {/* Sustainability aggregate */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {aggregate.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : aggregate.data ? (
          <>
            <MetricCard
              icon={<Droplets className="size-5 text-brand-cyan" />}
              label={`Water saved · ${aggregate.data.period_label}`}
              value={`${formatNumber(aggregate.data.water_saved_l, 0)} L`}
              accent="var(--color-brand-cyan)"
            />
            <MetricCard
              icon={<Leaf className="size-5 text-primary" />}
              label="CO₂ reduced"
              value={`${formatNumber(aggregate.data.co2_saved_tons, 1)} t`}
              accent="var(--color-primary)"
            />
            <MetricCard
              icon={<Zap className="size-5 text-warning" />}
              label="Energy reduction"
              value={`${aggregate.data.energy_saved_pct}%`}
              accent="var(--color-warning)"
            />
          </>
        ) : null}
      </div>

      {/* Recent sessions */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">
              Recent sessions
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/sessions">View all</Link>
            </Button>
          </div>

          {sessions.isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : sessions.isError ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load sessions.
              </p>
              <Button size="sm" variant="outline" onClick={() => sessions.refetch()}>
                Retry
              </Button>
            </div>
          ) : sessions.data && sessions.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Dye</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Compat.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.dye_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {s.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.mode ? (
                        <ModeBadge mode={s.mode} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.compatibility_score ?? "—"}
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/experiment/${s.id}/step-1`}>
                          {s.status === "complete" ? "View" : "Resume"}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10">
                <FlaskConical className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Start your first experiment</p>
                <p className="text-sm text-muted-foreground">
                  Screen a dye, optimize the process, and quantify your savings.
                </p>
              </div>
              <NewExperimentButton />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: accent }}
      />
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="font-display text-3xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
