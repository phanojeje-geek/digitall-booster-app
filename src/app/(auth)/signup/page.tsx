import Link from "next/link";

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
        <h1 className="text-2xl font-semibold tracking-tight">Inscription desactivee</h1>
        <p className="text-sm text-zinc-500">
          Cette application est reservee a un usage entreprise. Un administrateur doit creer votre compte.
        </p>
      </div>
      {params.error ? (
        <p className="rounded-xl bg-red-100 p-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      <p className="text-sm text-zinc-500">
        Vous avez deja un compte ?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
