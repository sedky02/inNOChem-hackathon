import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "operator" | "engineer" | "admin";

export interface User {
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  hydrated: boolean;
  login: (email: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

/**
 * Mock authentication. Any email "logs in" (the demo backend has no real auth
 * yet); role is inferred from the address for quick permission testing. Replace
 * `login` with a real POST /auth/login + httpOnly cookie when the backend lands.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      login: (email) =>
        set({
          user: {
            email,
            name: deriveName(email),
            role: deriveRole(email),
          },
        }),
      logout: () => set({ user: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "greendye-auth",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

function deriveName(email: string): string {
  const local = email.split("@")[0] ?? "Operator";
  return local
    .split(/[.\-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function deriveRole(email: string): Role {
  if (email.startsWith("admin")) return "admin";
  if (email.startsWith("engineer") || email.includes("eng")) return "engineer";
  return "operator";
}
