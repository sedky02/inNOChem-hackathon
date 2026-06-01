"use client";

import { User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
              <UserIcon className="size-6" />
            </span>
            <div>
              <div className="font-display text-lg font-semibold">
                {user?.name ?? "Guest"}
              </div>
              <Badge variant="outline" className="mt-1 capitalize">
                {user?.role ?? "operator"}
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input defaultValue={user?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue={user?.email ?? ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select defaultValue="utc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="cet">Central European (CET)</SelectItem>
                  <SelectItem value="est">Eastern (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Email me when a high-risk configuration is flagged",
            "Notify me when model recalibration completes",
            "Weekly sustainability summary",
          ].map((label, i) => (
            <label key={label} className="flex items-center gap-3 text-sm">
              <Checkbox defaultChecked={i < 2} />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
