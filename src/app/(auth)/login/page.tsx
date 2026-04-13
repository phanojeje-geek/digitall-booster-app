import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { signInAction } from "@/features/auth/actions";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          Digital Booster Secure Access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Connexion</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Connectez-vous pour acceder au suivi d activite, aux projets et au dashboard selon votre role.
        </p>
      </div>

      {params.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {params.error}
        </p>
      ) : null}

      <CardBlock title="Identifiants">
        <LoginForm action={signInAction} />
      </CardBlock>

      <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
        <p className="mb-1 inline-flex items-center gap-1 font-semibold">
          <ShieldCheck size={14} />
          Acces securise
        </p>
        <p>Le role applique automatiquement les permissions et la vue dashboard correspondante.</p>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Pas de compte ?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
          Creer un compte
        </Link>
      </p>
    </div>
  );
}

function CardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <p className="mb-3 font-semibold">{title}</p>
      {children}
    </div>
  );
}
