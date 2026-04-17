import { ShieldCheck } from "lucide-react";
import { signInAction } from "@/features/auth/actions";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; blocked?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
          Digital Booster Secure Access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Connexion</h1>
        <p className="text-sm text-white/85">
          Connectez-vous pour acceder au suivi d activite, aux projets et au dashboard selon votre role.
        </p>
      </div>

      {params.blocked ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Votre acces est bloque. Contactez votre administrateur.
        </p>
      ) : null}

      {!params.blocked && params.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {getErrorMessage(params.error)}
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
        Besoin d un compte ? Contactez un administrateur de votre entreprise.
      </p>
    </div>
  );
}

function getErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    "Invalid login credentials": "Adresse email ou mot de passe incorrect",
    "Email not confirmed": "Email non confirmé. Veuillez vérifier votre boîte mail",
    "User not found": "Utilisateur non trouvé",
    "Too many requests": "Trop de tentatives de connexion. Veuillez réessayer plus tard",
    "Network error": "Erreur de réseau. Vérifiez votre connexion internet",
    "invalid_grant": "Session expirée. Veuillez vous reconnecter",
  };
  
  return errorMap[error] || `Erreur de connexion: ${error}`;
}

function CardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <p className="mb-3 font-semibold">{title}</p>
      {children}
    </div>
  );
}
