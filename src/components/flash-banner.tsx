"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Banner = {
  tone: "success" | "error";
  message: string;
};

function resolveBanner(error?: string | null, reset?: string | null, password?: string | null): Banner | null {
  if (reset) {
    return { tone: "success", message: "Email de reinitialisation envoye." };
  }
  if (password) {
    return { tone: "success", message: "Mot de passe mis a jour." };
  }
  if (error) {
    if (error === "reset") {
      return { tone: "error", message: "Reset impossible. Verifiez les URLs de redirection Supabase puis reessayez." };
    }
    if (error === "password") {
      return { tone: "error", message: "Changement de mot de passe impossible. Reessayez." };
    }
    return { tone: "error", message: "Operation impossible. Reessayez." };
  }
  return null;
}

export function FlashBanner({ autoHideMs = 7000 }: { autoHideMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolved = useMemo(() => {
    const error = searchParams.get("error");
    const reset = searchParams.get("reset");
    const password = searchParams.get("password");
    const banner = resolveBanner(error, reset, password);
    const key = banner ? `e=${error ?? ""}&r=${reset ?? ""}&p=${password ?? ""}` : null;
    return { banner, key };
  }, [searchParams]);

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const clear = useCallback(() => {
    if (resolved.key) setDismissedKey(resolved.key);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    next.delete("reset");
    next.delete("password");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, resolved.key, router, searchParams]);

  useEffect(() => {
    if (!resolved.banner || !resolved.key) return;
    if (dismissedKey === resolved.key) return;
    const t = window.setTimeout(() => clear(), autoHideMs);
    return () => window.clearTimeout(t);
  }, [autoHideMs, clear, dismissedKey, resolved.banner, resolved.key]);

  if (!resolved.banner || (resolved.key && dismissedKey === resolved.key)) return null;

  const className =
    resolved.banner.tone === "success"
      ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";

  return (
    <div role="status" className={cn("flex items-start justify-between gap-3", className)}>
      <span>{resolved.banner.message}</span>
      <Button type="button" variant="ghost" aria-label="Fermer" className="h-8 w-8 px-0" onClick={clear}>
        <X size={16} />
      </Button>
    </div>
  );
}
