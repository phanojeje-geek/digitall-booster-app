"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export function EnterAppButton({
  href = "/app",
  className,
  children,
}: {
  href?: string;
  className: string;
  children: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <a
        href={href}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          if (loading) return;
          setLoading(true);
          router.push(href);
        }}
      >
        {children}
      </a>

      {loading ? (
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
      ) : null}
    </>
  );
}

