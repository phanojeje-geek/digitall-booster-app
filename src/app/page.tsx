import Link from "next/link";
import Image from "next/image";
import { Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="startup-orbit startup-orbit-a" />
      <div className="startup-orbit startup-orbit-b" />

      <div className="startup-card w-full max-w-3xl rounded-3xl border border-white/20 bg-slate-950/45 p-6 text-white shadow-2xl backdrop-blur-xl md:p-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="startup-rocket-wrap">
            <Rocket className="startup-rocket h-10 w-10 text-cyan-300" />
            <span className="startup-flame" />
          </div>
        </div>

        <div className="mx-auto mb-5 w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-2">
          <Image
            src="/logo-digitall-booster.svg"
            alt="Digital Booster Logo"
            width={1200}
            height={520}
            className="startup-logo h-auto w-full rounded-xl object-cover"
          />
        </div>

        <div className="text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-200/80">Digital Booster App</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Workspace SaaS interne
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-200/85 md:text-base">
            Pilotez clients, projets, taches et equipe dans une interface premium, rapide et mobile-first.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/app"
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300"
            >
              Entrer dans l application
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
