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
  let documents: Array<{
    id: string;
    owner_id: string;
    client_id: string;
    doc_type: string;
    file_name: string;
    storage_path: string;
    created_at: string;
  }> = [];
  let screenshots: Array<{
    id: string;
    user_id: string;
    project_id: string;
    description: string;
    screenshot_path: string;
    created_at: string;
  }> = [];
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let signedClientFiles: Record<string, string> = {};
  let signedClientDocs: Record<string, string> = {};
  let signedActivityReports: Record<string, string> = {};
  let ownersById: Record<string, { full_name: string | null; role: Role | null }> = {};
  let projectsById: Record<string, string> = {};

  if (!isDemoMode) {
    supabase = await createClient();
    const selectedUserId = qp.user && isAdmin ? qp.user : user.id;
    const results = await Promise.all([
      isAdmin
        ? supabase.from("clients").select("id,nom").order("nom")
        : supabase.from("clients").select("id,nom").eq("owner_id", user.id).order("nom"),
      supabase
        .from("files_index")
        .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
        .eq("owner_id", selectedUserId)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("client_documents")
        .select("id,owner_id,client_id,doc_type,file_name,storage_path,created_at")
        .eq("owner_id", selectedUserId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("activity_reports")
        .select("id,user_id,project_id,description,screenshot_path,created_at")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    clients = results[0].data ?? [];
    files = results[1].data ?? [];
    documents = results[2].data ?? [];
    screenshots = results[3].data ?? [];

    const fileIds = (files ?? []).map((f) => f.storage_path);
    const urlResults = await Promise.all(
      fileIds.map(async (path) => {
        const { data } = await supabase!.storage.from("client-files").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedClientFiles = Object.fromEntries(urlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    const docPaths = (documents ?? []).map((d) => d.storage_path);
    const docUrlResults = await Promise.all(
      docPaths.map(async (path) => {
        const { data } = await supabase!.storage.from("client-documents").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedClientDocs = Object.fromEntries(docUrlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    const reportPaths = (screenshots ?? []).map((r) => r.screenshot_path);
    const reportUrlResults = await Promise.all(
      reportPaths.map(async (path) => {
        const { data } = await supabase!.storage.from("activity-reports").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedActivityReports = Object.fromEntries(reportUrlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    if (isAdmin) {
      const ownerIds = Array.from(
        new Set(
          [
            ...(files ?? []).map((f) => (f as { owner_id?: string }).owner_id).filter(Boolean),
            ...(documents ?? []).map((d) => d.owner_id).filter(Boolean),
            ...(screenshots ?? []).map((r) => r.user_id).filter(Boolean),
          ].filter(Boolean),
        ),
      );
      if (ownerIds.length) {
        const { data: owners } = await supabase.from("profiles").select("id,full_name,role").in("id", ownerIds as string[]);
        ownersById = Object.fromEntries(
          (owners ?? []).map((o) => [o.id, { full_name: o.full_name ?? null, role: (o.role as Role | null) ?? null }]),
        );
      }
    }

    const projectIds = Array.from(new Set((screenshots ?? []).map((r) => r.project_id).filter(Boolean)));
    if (projectIds.length) {
      const { data: projects } = await supabase.from("projects").select("id,nom").in("id", projectIds as string[]);
      projectsById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.nom]));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{isAdmin ? "Archives (preuves)" : "Fichiers Clients"}</h1>
      <Card>
        <h2 className="mb-3 font-semibold">Uploader un fichier</h2>
        <ClientFilesUploader clients={clients ?? []} />
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Fichiers (client-files)</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(files ?? []).map((file) => {
          const signedUrl = supabase ? signedClientFiles[file.storage_path] ?? "" : file.storage_path;
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

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Documents identite (client-documents)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(documents ?? []).map((doc) => {
            const signedUrl = supabase ? signedClientDocs[doc.storage_path] ?? "" : doc.storage_path;
            const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
            const owner = isAdmin ? ownersById[doc.owner_id] : null;

            return (
              <Card key={doc.id} className="space-y-2">
                {isImage && signedUrl ? (
                  <Image
                    src={signedUrl}
                    alt={doc.file_name}
                    width={400}
                    height={220}
                    className="h-36 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                    Apercu indisponible
                  </div>
                )}
                <p className="truncate text-sm font-medium">{doc.doc_type.replaceAll("_", " ").toUpperCase()}</p>
                <p className="truncate text-xs text-zinc-500">{doc.file_name}</p>
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

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Captures activite (activity-reports)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(screenshots ?? []).map((item) => {
            const signedUrl = supabase ? signedActivityReports[item.screenshot_path] ?? "" : item.screenshot_path;
            const owner = isAdmin ? ownersById[item.user_id] : null;
            const projectName = projectsById[item.project_id] ?? item.project_id;

            return (
              <Card key={item.id} className="space-y-2">
                {signedUrl ? (
                  <Image
                    src={signedUrl}
                    alt={item.description}
                    width={400}
                    height={220}
                    className="h-36 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                    Apercu indisponible
                  </div>
                )}
                <p className="truncate text-sm font-medium">{projectName}</p>
                <p className="truncate text-xs text-zinc-500">{item.description}</p>
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
    </div>
  );
}
