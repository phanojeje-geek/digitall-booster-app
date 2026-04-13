import type { Role } from "@/lib/types";

export type AppRouteKey = "dashboard" | "clients" | "projects" | "activity" | "storage" | "cms" | "users";

export const routePathByKey: Record<AppRouteKey, string> = {
  dashboard: "/app",
  clients: "/app/clients",
  projects: "/app/projects",
  activity: "/app/activity",
  storage: "/app/storage",
  cms: "/app/cms",
  users: "/app/users",
};

export const roleAccess: Record<Role, AppRouteKey[]> = {
  admin: ["dashboard", "clients", "projects", "activity", "storage", "cms", "users"],
  commercial: ["dashboard", "clients", "storage"],
  marketing: ["dashboard", "projects", "activity", "storage", "cms"],
  dev: ["dashboard", "projects", "activity", "storage"],
  designer: ["dashboard", "projects", "activity", "storage"],
};

export function canAccessRoute(role: Role, pathname: string) {
  const allowedKeys = roleAccess[role] ?? [];
  const allowedPaths = allowedKeys.map((key) => routePathByKey[key]);
  return allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
