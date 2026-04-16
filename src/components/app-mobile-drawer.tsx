"use client";

import { Menu, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppNav, type AppNavLink } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";

export function AppMobileDrawer({
  links,
  userName,
  role,
}: {
  links: AppNavLink[];
  userName: string;
  role: Role;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </Button>

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
          open ? "pointer-events-auto bg-zinc-950/75" : "pointer-events-none bg-transparent"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[320px] max-w-[88vw] border-r border-zinc-200 bg-white px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out dark:border-zinc-700 dark:bg-zinc-950 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-content-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Digital Booster</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-300">Agency Workspace</p>
            </div>
          </div>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X size={16} />
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs uppercase text-zinc-500 dark:text-zinc-300">{role}</p>
          </div>
          <AppNav links={links} onNavigate={() => setOpen(false)} className="p-2" />
        </div>
      </aside>
    </>
  );
}
