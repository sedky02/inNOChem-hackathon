import { apiClient, mockLatency, USE_MOCKS } from "@/lib/api/client";
import {
  mockAdapt,
  mockOptimize,
  mockScreen,
} from "@/lib/mocks/generators";
import {
  createSession,
  dashboardAggregate,
  getSession,
  listSessions,
  updateSession,
} from "@/lib/mocks/sessions";
import type {
  AdaptRequest,
  AdaptResponse,
  ConfigManifest,
  DashboardAggregate,
  OptimizationMode,
  OptimizeRequest,
  OptimizeResponse,
  ProcessParameters,
  ScreenRequest,
  ScreeningResult,
  SessionStatus,
  SessionSummary,
} from "@/lib/types";

// ── chemical screening ───────────────────────────────────────

export async function screenChemical(
  req: ScreenRequest,
): Promise<ScreeningResult> {
  if (USE_MOCKS) {
    await mockLatency(600, 1200);
    return mockScreen(req);
  }
  const { data } = await apiClient.post<ScreeningResult>(
    "/api/v1/chemical/screen",
    req,
  );
  return data;
}

// ── process optimization ─────────────────────────────────────

export async function optimizeProcess(
  req: OptimizeRequest,
): Promise<OptimizeResponse> {
  if (USE_MOCKS) {
    await mockLatency(400, 900);
    return mockOptimize(req);
  }
  const { data } = await apiClient.post<OptimizeResponse>(
    "/api/v1/process/optimize",
    req,
  );
  return data;
}

// ── adaptive feedback ────────────────────────────────────────

export async function adaptModel(req: AdaptRequest): Promise<AdaptResponse> {
  if (USE_MOCKS) {
    await mockLatency(700, 1400);
    return mockAdapt(req);
  }
  const { data } = await apiClient.post<AdaptResponse>(
    "/api/v1/model/adapt",
    req,
  );
  return data;
}

// ── sessions & dashboard ─────────────────────────────────────

export async function fetchSessions(): Promise<SessionSummary[]> {
  if (USE_MOCKS) {
    await mockLatency(250, 500);
    return listSessions();
  }
  const { data } = await apiClient.get<SessionSummary[]>("/api/sessions");
  return data;
}

export async function fetchSession(id: string): Promise<SessionSummary> {
  if (USE_MOCKS) {
    await mockLatency(200, 400);
    const s = getSession(id);
    if (!s) throw new Error(`Session ${id} not found`);
    return s;
  }
  const { data } = await apiClient.get<SessionSummary>(`/api/sessions/${id}`);
  return data;
}

export async function createNewSession(
  id: string,
  dyeName?: string,
): Promise<SessionSummary> {
  if (USE_MOCKS) {
    await mockLatency(150, 300);
    return createSession(id, dyeName);
  }
  const { data } = await apiClient.post<SessionSummary>("/api/sessions", {
    id,
    dye_name: dyeName,
  });
  return data;
}

export async function patchSession(
  id: string,
  patch: Partial<SessionSummary>,
): Promise<SessionSummary | undefined> {
  if (USE_MOCKS) {
    await mockLatency(100, 250);
    return updateSession(id, patch);
  }
  const { data } = await apiClient.put<SessionSummary>(
    `/api/sessions/${id}`,
    patch,
  );
  return data;
}

export async function fetchDashboardAggregate(): Promise<DashboardAggregate> {
  if (USE_MOCKS) {
    await mockLatency(250, 500);
    return dashboardAggregate();
  }
  const { data } = await apiClient.get<DashboardAggregate>(
    "/api/dashboard/aggregate",
  );
  return data;
}

// ── config manifest (Step 5) ─────────────────────────────────

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function sealConfig(input: {
  session_id: string;
  dye_name: string;
  mode: OptimizationMode;
  parameters: ProcessParameters;
  engineer_ack: boolean;
}): ConfigManifest {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ ...input, timestamp });
  const verification_hash = `${simpleHash(payload)}-${simpleHash(payload.split("").reverse().join(""))}`;
  return {
    ...input,
    timestamp,
    verification_hash,
    signature: `gdt::${simpleHash(input.session_id + timestamp)}`,
  };
}

export type { SessionStatus };
