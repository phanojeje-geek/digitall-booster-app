import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { mockClients, mockFiles } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import { uploadClientFileAction } from "@/features/storage/actions";

export default async function StoragePage() {
  const user = await getCurrentUser();
  let clients = mockClients.map((c) => ({ id: c.id, nom: c.nom }));
  let files = mockFiles;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  if (!isDemoMode) {
    supabase = await createClient();
    const results = await Promise.all([
      supabase.from("clients").select("id,nom").eq("owner_id", user.id).order("nom"),
      supabase
        .from("files_index")
        .select("id,file_name,mime_type,storage_path,client_id,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);
    clients = results[0].data ?? [];
    files = results[1].data ?? [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fichiers Clients</h1>
      <Card>
        <h2 className="mb-3 font-semibold">Uploader un fichier</h2>
        <form action={uploadClientFileAction} className="grid gap-3 md:grid-cols-3">
          <select
            name="client_id"
            required
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Selectionner un client</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom}
              </option>
            ))}
          </select>
          <input
            name="file"
            type="file"
            required
            className="h-10 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          />
          <Button type="submit">Upload</Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(files ?? []).map((file) => {
          const publicUrl = supabase
            ? supabase.storage.from("client-files").getPublicUrl(file.storage_path).data.publicUrl
            : file.storage_path;
          const image = file.mime_type?.startsWith("image/");

          return (
            <Card key={file.id} className="space-y-2">
              {image ? (
                <Image
                  src={publicUrl}
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
