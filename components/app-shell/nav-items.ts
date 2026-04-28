import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  Bell,
  Users,
  Building2,
  MapPin,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { RoleName } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show: (roles: RoleName[]) => boolean;
  group: "primary" | "admin";
};

const has = (roles: RoleName[], ...r: RoleName[]) =>
  r.some((x) => roles.includes(x));

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    show: () => true,
    group: "primary",
  },
  {
    href: "/events",
    label: "Events",
    icon: ClipboardList,
    show: () => true,
    group: "primary",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    show: () => true,
    group: "primary",
  },
  {
    href: "/my-tasks",
    label: "My tasks",
    icon: CheckSquare,
    show: (roles) => has(roles, "DEPT_MANAGER", "DEPT_TEAM_MEMBER"),
    group: "primary",
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    show: () => true,
    group: "primary",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    show: (roles) => has(roles, "ADMIN"),
    group: "admin",
  },
  {
    href: "/admin/departments",
    label: "Departments",
    icon: Building2,
    show: (roles) => has(roles, "ADMIN"),
    group: "admin",
  },
  {
    href: "/admin/venues",
    label: "Venues",
    icon: MapPin,
    show: (roles) => has(roles, "ADMIN"),
    group: "admin",
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: ScrollText,
    show: (roles) => has(roles, "ADMIN"),
    group: "admin",
  },
];

export const BOTTOM_NAV_HREFS = [
  "/dashboard",
  "/events",
  "/calendar",
  "/my-tasks",
];
