export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071a3a] px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.55),transparent_50%),radial-gradient(circle_at_82%_82%,rgba(34,211,238,0.35),transparent_55%),repeating-linear-gradient(135deg,rgba(255,255,255,0.10)_0px,rgba(255,255,255,0.10)_1px,transparent_1px,transparent_14px)] opacity-90" />

      <div className="relative grid w-full max-w-[980px] overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur lg:grid-cols-[0.92fr_1fr]">
        <div className="hidden border-r border-white/10 bg-white/5 p-7 lg:block">
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            Digital Booster
          </p>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Votre cockpit de performance</h2>
          <p className="mt-3 text-sm text-white/80">
            Suivez l activite des equipes, les projets clients et les KPI metier dans une seule interface.
          </p>
          <div className="mt-7 space-y-3 text-sm text-white/80">
            <p>Tracking activite en temps reel</p>
            <p>Rapports avec captures obligatoires</p>
            <p>Permissions par role et controle admin</p>
          </div>
        </div>

        <div className="max-h-[88vh] overflow-auto p-5 text-zinc-900 sm:p-7 lg:p-8 dark:text-zinc-100">
          {children}
        </div>
      </div>
    </div>
  );
}
