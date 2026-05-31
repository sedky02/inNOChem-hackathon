import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /dashboard/sessions still highlights Dashboard). */
  matchPrefix?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, matchPrefix: true },
  { label: "Experiments", href: "/experiment", icon: FlaskConical, matchPrefix: true },
  { label: "Reports", href: "/reports", icon: FileText, matchPrefix: true },
  { label: "Settings", href: "/settings", icon: Settings, matchPrefix: true },
];
