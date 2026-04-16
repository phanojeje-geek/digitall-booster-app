import { LogOut, Search, Sparkles } from "lucide-react";
import { AppMobileDrawer } from "@/components/app-mobile-drawer";
import { AppNav, type AppNavIcon, type AppNavLink } from "@/components/app-nav";
import { CommercialLiveLocation } from "@/components/commercial-live-location";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { Input } from "@/components/ui/input";
import { roleAccess } from "@/lib/rbac";
import { isDemoMode } from "@/lib/runtime";
import { signOutAction } from "../features/auth/actions";
import type { Profile, Role } from "@/lib/types";

const links = [
  { href: "/app", label: "Dashboard", icon: "dashboard" },
  { href: "/app/clients", label: "Clients", icon: "clients" },
  { href: "/app/projects", label: "Projets", icon: "projects" },
  { href: "/app/activity", label: "Activite", icon: "activity" },
  { href: "/app/storage", label: "Fichiers", icon: "storage" },
  { href: "/app/users", label: "Utilisateurs", icon: "users" },
  { href: "/app/live", label: "Live", icon: "live" },
] satisfies AppNavLink[];

const keyByPath: Record<string, AppNavIcon> = {
  "/app": "dashboard",
  "/app/clients": "clients",
  "/app/projects": "projects",
  "/app/activity": "activity",
  "/app/storage": "storage",
  "/app/users": "users",
  "/app/live": "live",
};

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const currentRole: Role = profile?.role ?? "dev";
  const visibleLinks = links.filter((link) => {
    const key = keyByPath[link.href];
    return roleAccess[currentRole].includes(key);
  });

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-[#070b16] dark:text-zinc-100">
      {!isDemoMode ? <CommercialLiveLocation role={currentRole} /> : null}
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-zinc-200/80 bg-white/88 p-4 backdrop-blur lg:flex lg:flex-col dark:border-zinc-800/80 dark:bg-[#0d1528]">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-content-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Digital Booster</p>
              <p className="text-xs text-zinc-500">Agency Workspace</p>
            </div>
          </div>
          <AppNav links={visibleLinks} />
          <div className="mt-auto rounded-2xl border border-indigo-200/70 bg-indigo-50/90 p-3 text-xs text-indigo-900 dark:border-indigo-700/50 dark:bg-indigo-500/10 dark:text-indigo-200">
            <p className="mb-1 font-semibold">Mode Productivite</p>
            <p>Synchronisez vos clients, projets et activites en un seul espace.</p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6 md:py-3 md:pt-3 md:backdrop-blur dark:border-zinc-800/80 dark:bg-[#0f172b]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <AppMobileDrawer
                  links={visibleLinks}
                  userName={profile?.full_name ?? "Utilisateur"}
                  role={currentRole}
                />
                <div className="relative hidden max-w-md flex-1 sm:block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input className="pl-9" placeholder="Rechercher un client, un projet, une tache..." />
                </div>
              </div>
              <p className="hidden text-sm font-medium sm:block">{profile?.full_name ?? "Utilisateur"}</p>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <span className="hidden rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:inline-flex">
                  {profile?.role ?? "role"}
                </span>
                <NotificationBell />
                <ConfirmForm action={signOutAction} confirmMessage="Confirmer la deconnexion ?">
                  <>
                    <Button type="submit" variant="ghost" className="hidden sm:inline-flex">
                      Deconnexion
                    </Button>
                    <Button type="submit" variant="ghost" className="sm:hidden" aria-label="Deconnexion">
                      <LogOut size={16} />
                    </Button>
                  </>
                </ConfirmForm>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 text-zinc-900 md:p-6 lg:p-8 dark:text-zinc-100">{children}</main>
        </div>
      </div>
    </div>
  );
}
