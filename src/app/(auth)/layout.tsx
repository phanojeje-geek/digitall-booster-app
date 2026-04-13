export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_45%)]" />

      <div className="relative grid w-full max-w-[980px] overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/92 shadow-2xl backdrop-blur lg:grid-cols-[0.92fr_1fr] dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="hidden border-r border-zinc-200/80 bg-zinc-50/80 p-7 lg:block dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            Digital Booster
          </p>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Votre cockpit de performance</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Suivez l activite des equipes, les projets clients et les KPI metier dans une seule interface.
          </p>
          <div className="mt-7 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <p>Tracking activite en temps reel</p>
            <p>Rapports avec captures obligatoires</p>
            <p>Permissions par role et controle admin</p>
          </div>
        </div>

        <div className="max-h-[88vh] overflow-auto p-5 sm:p-7 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
