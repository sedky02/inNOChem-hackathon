import axios from "axios";
import { getAccessToken, setAccessToken } from "@/lib/api/token";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT bearer token to every request (real-backend path).
apiClient.interceptors.request.use((config) => {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL must be set when NEXT_PUBLIC_USE_MOCKS is not true.");
  }
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
