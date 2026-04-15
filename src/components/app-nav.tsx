"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BriefcaseBusiness,
  Files,
  LayoutDashboard,
  LucideIcon,
  Radar,
  ShieldCheck,
  Users,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppNavIcon = "dashboard" | "clients" | "projects" | "activity" | "storage" | "cms" | "users" | "live";

export type AppNavLink = {
  href: string;
  label: string;
  icon: AppNavIcon;
};

const iconMap: Record<AppNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  projects: BriefcaseBusiness,
  activity: Activity,
  storage: Files,
  cms: WandSparkles,
  users: ShieldCheck,
  live: Radar,
};

export function AppNav({
  links,
  onNavigate,
  className,
}: {
  links: AppNavLink[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-1", className)}>
      {links.map(({ href, label, icon }) => {
        const active = pathname === href;
        const Icon = iconMap[icon];
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98] [touch-action:manipulation]",
              active
                ? "translate-x-1 bg-indigo-500/10 text-indigo-700 shadow-sm dark:bg-indigo-500/30 dark:text-indigo-100"
                : "text-zinc-600 hover:translate-x-1 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-100/90 dark:hover:bg-zinc-800 dark:hover:text-white",
            )}
          >
            <Icon
              size={16}
              className={cn(
                "transition-all duration-300 ease-out",
                active
                  ? "text-indigo-600 dark:text-indigo-100"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-300 dark:group-hover:text-white",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
