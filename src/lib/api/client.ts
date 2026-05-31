import axios from "axios";
import { getAccessToken, setAccessToken } from "@/lib/api/token";

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
});

// Attach the JWT bearer token to every request (real-backend path).
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the token and bounce to the login page (browser only).
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      setAccessToken(null);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Simulated network latency for the mock layer, so loading states are real. */
export function mockLatency(min = 350, max = 850): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
