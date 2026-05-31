import axios from "axios";

/**
 * When NEXT_PUBLIC_USE_MOCKS is not explicitly "false", the app runs entirely
 * on the in-memory mock layer (no backend needed). Set NEXT_PUBLIC_API_URL and
 * NEXT_PUBLIC_USE_MOCKS=false to point at a real FastAPI backend instead.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/** Simulated network latency for the mock layer, so loading states are real. */
export function mockLatency(min = 350, max = 850): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
