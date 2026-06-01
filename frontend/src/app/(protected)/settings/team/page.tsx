"use client";

import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const TEAM = [
  { name: "Avery Chen", email: "admin@greendye.io", role: "admin" },
  { name: "Sam Okafor", email: "engineer@greendye.io", role: "engineer" },
  { name: "Lena Park", email: "operator@greendye.io", role: "operator" },
];

export default function TeamSettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "admin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Team management is restricted to administrators.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" /> Team members
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {TEAM.length} members
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEAM.map((m) => (
                <TableRow key={m.email}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite a member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input
              type="email"
              placeholder="colleague@company.com"
              className="min-w-56 flex-1"
            />
            <Button type="submit" className="gap-1.5">
              <UserPlus className="size-4" /> Send invite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
