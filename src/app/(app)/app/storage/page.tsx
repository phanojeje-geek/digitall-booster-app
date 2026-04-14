import Image from "next/image";
import { Card } from "@/components/ui/card";
import { ClientFilesUploader } from "@/components/uploaders";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockFiles } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export default async function StoragePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const role: Role = profile?.role ?? "dev";
  const isAdmin = role === "admin";
  const qp = await searchParams;
  let clients = mockClients.map((c) => ({ id: c.id, nom: c.nom }));
  let files = mockFiles;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let signedUrls: Record<string, string> = {};
  let ownersById: Record<string, { full_name: string | null; role: Role | null }> = {};

  if (!isDemoMode) {
    supabase = await createClient();
    const results = await Promise.all([
      isAdmin
        ? supabase.from("clients").select("id,nom").order("nom")
        : supabase.from("clients").select("id,nom").eq("owner_id", user.id).order("nom"),
      supabase
        .from("files_index")
        .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
        .eq("owner_id", qp.user && isAdmin ? qp.user : user.id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);
    clients = results[0].data ?? [];
    files = results[1].data ?? [];

    const fileIds = (files ?? []).map((f) => f.storage_path);
    const urlResults = await Promise.all(
      fileIds.map(async (path) => {
        const { data } = await supabase!.storage.from("client-files").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedUrls = Object.fromEntries(urlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    if (isAdmin) {
      const ownerIds = Array.from(new Set((files ?? []).map((f) => (f as { owner_id?: string }).owner_id).filter(Boolean)));
      if (ownerIds.length) {
        const { data: owners } = await supabase.from("profiles").select("id,full_name,role").in("id", ownerIds as string[]);
        ownersById = Object.fromEntries(
          (owners ?? []).map((o) => [o.id, { full_name: o.full_name ?? null, role: (o.role as Role | null) ?? null }]),
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fichiers Clients</h1>
      <Card>
        <h2 className="mb-3 font-semibold">Uploader un fichier</h2>
        <ClientFilesUploader clients={clients ?? []} />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(files ?? []).map((file) => {
          const signedUrl = supabase ? signedUrls[file.storage_path] ?? "" : file.storage_path;
          const image = file.mime_type?.startsWith("image/");
          const owner = isAdmin ? ownersById[(file as unknown as { owner_id: string }).owner_id] : null;

          return (
            <Card key={file.id} className="space-y-2">
              {image ? (
                <Image
                  src={signedUrl}
                  alt={file.file_name}
                  width={400}
                  height={220}
                  className="h-36 w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                  Apercu indisponible
                </div>
              )}
              <p className="truncate text-sm font-medium">{file.file_name}</p>
              {isAdmin && owner ? (
                <p className="truncate text-xs text-zinc-500">
                  {owner.full_name ?? "Utilisateur"} {owner.role ? `(${owner.role})` : ""}
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
