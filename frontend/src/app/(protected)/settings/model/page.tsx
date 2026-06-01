"use client";

import { Brain, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/stores/auth-store";

const VERSIONS = [
  { version: "v1.4", date: "2026-05-28", accuracy: 0.91, status: "active" },
  { version: "v1.3", date: "2026-05-14", accuracy: 0.88, status: "retired" },
  { version: "v1.2", date: "2026-04-30", accuracy: 0.85, status: "retired" },
  { version: "v1.1", date: "2026-04-12", accuracy: 0.82, status: "retired" },
];

const TREND = [...VERSIONS]
  .reverse()
  .map((v) => ({ version: v.version, accuracy: Math.round(v.accuracy * 100) }));

export default function ModelSettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "admin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Model calibration is restricted to administrators.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-primary" /> Accuracy trend
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              toast.success("Retraining queued", {
                description: "A recalibration job has been scheduled.",
              })
            }
          >
            <RefreshCw className="size-4" /> Trigger retraining
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={TREND} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="version" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis
                domain={[70, 100]}
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Version</TableHead>
                <TableHead>Trained</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VERSIONS.map((v) => (
                <TableRow key={v.version}>
                  <TableCell className="font-mono font-medium">
                    {v.version}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.date}</TableCell>
                  <TableCell className="text-right font-mono">
                    {(v.accuracy * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        v.status === "active"
                          ? "border-success/30 bg-success/15 text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
