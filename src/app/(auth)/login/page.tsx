"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("engineer@greendye.io");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Mock auth — resolves instantly, but mimics a network round-trip.
    setTimeout(() => {
      login(email);
      router.replace("/dashboard");
    }, 500);
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      {/* Ambient scientific backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 top-10 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 size-96 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-sm border-border/80 shadow-lg">
        <CardHeader className="items-center gap-3 text-center">
          <Brand />
          <div>
            <CardTitle className="font-display text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your sustainable dyeing workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo mode — any email works. Prefix with{" "}
              <span className="font-mono text-foreground">admin</span> or{" "}
              <span className="font-mono text-foreground">engineer</span> to
              test roles.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
