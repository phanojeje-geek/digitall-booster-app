import Link from "next/link";
import { signUpAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
          Workspace SaaS
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Inscription</h1>
        <p className="text-sm text-zinc-500">Creez votre acces a l application SaaS.</p>
      </div>
      {params.error ? (
        <p className="rounded-xl bg-red-100 p-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      <form action={signUpAction} className="space-y-3">
        <Input name="full_name" required placeholder="Nom complet" />
        <Input name="email" type="email" required placeholder="Email" />
        <Input name="password" type="password" required placeholder="Mot de passe" />
        <select
          name="role"
          className="h-10 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          defaultValue="dev"
        >
          <option value="admin">admin</option>
          <option value="commercial">commercial</option>
          <option value="marketing">marketing</option>
          <option value="dev">dev</option>
          <option value="designer">designer</option>
        </select>
        <Button type="submit" className="w-full" variant="secondary">
          Creer un compte
        </Button>
      </form>
      <p className="text-sm text-zinc-500">
        Deja inscrit ?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
