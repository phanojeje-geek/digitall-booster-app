"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function AppSplash() {
  const [visible, setVisible] = useState(() => isStandalone());

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 550);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950">
      <div className="startup-orbit startup-orbit-a" />
      <div className="startup-orbit startup-orbit-b" />
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-950/35 p-5 text-white shadow-2xl backdrop-blur-xl">
        <div className="mx-auto w-full overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-2">
          <Image
            src="/logo-digitall-booster.svg"
            alt="Digital Booster"
            width={900}
            height={380}
            className="startup-logo h-auto w-full rounded-xl object-cover"
            priority
          />
        </div>
        <p className="mt-4 text-center text-sm text-slate-200/85">Chargement...</p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-cyan-300/90" />
        </div>
      </div>
    </div>
  );
}
