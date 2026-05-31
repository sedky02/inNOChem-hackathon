import type {
  DashboardAggregate,
  SessionStatus,
  SessionSummary,
} from "@/lib/types";

/**
 * In-memory mock session store. Seeded with historical runs for the dashboard;
 * newly created sessions are appended (resets on full reload — fine for a demo).
 */

const seed: SessionSummary[] = [
  {
    id: "GD-2026-0528-RB19",
    dye_name: "Reactive Blue 19",
    mode: "balanced",
    compatibility_score: 84,
    risk_level: "MEDIUM",
    created_at: "2026-05-28T09:14:00.000Z",
    status: "complete",
  },
  {
    id: "GD-2026-0527-DR60",
    dye_name: "Disperse Red 60",
    mode: "eco",
    compatibility_score: 91,
    risk_level: "LOW",
    created_at: "2026-05-27T15:42:00.000Z",
    status: "complete",
  },
  {
    id: "GD-2026-0526-AB25",
    dye_name: "Acid Black 25",
    mode: "performance",
    compatibility_score: 67,
    risk_level: "HIGH",
    created_at: "2026-05-26T11:03:00.000Z",
    status: "complete",
  },
  {
    id: "GD-2026-0525-VB14",
    dye_name: "Vat Blue 14",
    mode: "balanced",
    compatibility_score: 58,
    risk_level: "MEDIUM",
    created_at: "2026-05-25T08:20:00.000Z",
    status: "in_progress",
  },
  {
    id: "GD-2026-0524-DY3",
    dye_name: "Disperse Yellow 3",
    mode: null,
    compatibility_score: 32,
    risk_level: null,
    created_at: "2026-05-24T16:55:00.000Z",
    status: "failed",
  },
];

const sessions = new Map<string, SessionSummary>(seed.map((s) => [s.id, s]));

export function listSessions(): SessionSummary[] {
  return [...sessions.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export function getSession(id: string): SessionSummary | undefined {
  return sessions.get(id);
}

export function createSession(id: string, dye_name = "Untitled experiment") {
  const session: SessionSummary = {
    id,
    dye_name,
    mode: null,
    compatibility_score: null,
    risk_level: null,
    created_at: new Date().toISOString(),
    status: "in_progress",
  };
  sessions.set(id, session);
  return session;
}

export function updateSession(id: string, patch: Partial<SessionSummary>) {
  const existing = sessions.get(id);
  if (!existing) return undefined;
  const next = { ...existing, ...patch };
  sessions.set(id, next);
  return next;
}

export function dashboardAggregate(): DashboardAggregate {
  const all = listSessions();
  return {
    period_label: "This month",
    water_saved_l: 14200,
    co2_saved_tons: 2.4,
    energy_saved_pct: 34,
    total_sessions: all.length,
    completed_sessions: all.filter((s) => s.status === "complete").length,
  };
}

export function newSessionId(dyeName: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const slug =
    dyeName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4) || "EXPR";
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `GD-${now.getFullYear()}-${stamp.slice(4)}-${slug}${rand}`;
}

export const validStatuses: SessionStatus[] = [
  "complete",
  "in_progress",
  "failed",
  "pending",
];
