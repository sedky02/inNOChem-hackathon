"use client";

/** Minimal access-token store for the real-backend path (JWT bearer). */
const KEY = "greendye-access-token";

let inMemory: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemory = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(KEY, token);
  else window.localStorage.removeItem(KEY);
}

export function getAccessToken(): string | null {
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return null;
  inMemory = window.localStorage.getItem(KEY);
  return inMemory;
}
