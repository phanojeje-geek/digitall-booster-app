"use client";

import { useEffect, useState, type ReactNode } from "react";

export function HomeLoader({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const next = Math.min(100, Math.round((elapsed / 1400) * 100));
      if (!mounted) return;
      setProgress(next);
      if (next >= 100) {
        setReady(true);
        return;
      }
      window.setTimeout(tick, 60);
    };
    tick();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
        <div className="startup-orbit startup-orbit-a" />
        <div className="startup-orbit startup-orbit-b" />
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-950/35 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-center text-sm font-semibold tracking-wide text-cyan-200">Digitall Booster CRM</p>
          <p className="mt-2 text-center text-xs text-slate-200/80">Chargement de l application...</p>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-slate-200/70">{progress}%</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

