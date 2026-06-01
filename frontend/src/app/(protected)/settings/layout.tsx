"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile", adminOnly: false },
  { href: "/settings/team", label: "Team", adminOnly: true },
  { href: "/settings/model", label: "Model", adminOnly: true },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "admin";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">
        Settings
      </h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <nav className="flex shrink-0 gap-1 sm:w-44 sm:flex-col">
          {TABS.map((t) => {
            const active = pathname === t.href;
            const locked = t.adminOnly && !isAdmin;
            return (
              <Link
                key={t.href}
                href={locked ? "#" : t.href}
                aria-disabled={locked}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  locked && "pointer-events-none opacity-40",
                )}
              >
                {t.label}
                {t.adminOnly && (
                  <span className="ml-1.5 text-[10px] uppercase text-muted-foreground">
                    admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
