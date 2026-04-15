import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ClientFilesUploader } from "@/components/uploaders";
import { ImageViewer } from "@/components/image-viewer";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockFiles } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export default async function StoragePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const LIMIT_FILES = 12;
  const LIMIT_DOCS = 12;
  const LIMIT_SCREENS = 12;

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
  let signedClientFiles: Record<string, string> = {};
  let signedClientDocs: Record<string, string> = {};
  let signedActivityReports: Record<string, string> = {};
  let ownersById: Record<string, { full_name: string | null; role: Role | null }> = {};
  let projectsById: Record<string, string> = {};
  let clientsById: Record<string, string> = {};
  let userOptions: Array<{ id: string; full_name: string | null; role: Role }> = [];

  if (!isDemoMode) {
    const db = isAdmin ? createAdminClient() : await createClient();
    const selectedUserId = isAdmin ? (qp.user ?? null) : user.id;
    const results = await Promise.all([
      isAdmin
        ? db.from("clients").select("id,nom").order("nom")
        : db.from("clients").select("id,nom").eq("owner_id", user.id).order("nom"),
      db
        .from("files_index")
        .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
        .eq("owner_id", selectedUserId ?? "")
        .order("created_at", { ascending: false })
        .limit(LIMIT_FILES),
      db
        .from("client_documents")
        .select("id,owner_id,client_id,doc_type,file_name,storage_path,created_at")
        .eq("owner_id", selectedUserId ?? "")
        .order("created_at", { ascending: false })
        .limit(LIMIT_DOCS),
      db
        .from("activity_reports")
        .select("id,user_id,project_id,description,screenshot_path,created_at")
        .eq("user_id", selectedUserId ?? "")
        .order("created_at", { ascending: false })
        .limit(LIMIT_SCREENS),
    ]);
    clients = results[0].data ?? [];
    if (isAdmin && !selectedUserId) {
      const [allFiles, allDocs, allScreens] = await Promise.all([
        db
          .from("files_index")
          .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
          .order("created_at", { ascending: false })
          .limit(LIMIT_FILES),
        db
          .from("client_documents")
          .select("id,owner_id,client_id,doc_type,file_name,storage_path,created_at")
          .order("created_at", { ascending: false })
          .limit(LIMIT_DOCS),
        db
          .from("activity_reports")
          .select("id,user_id,project_id,description,screenshot_path,created_at")
          .order("created_at", { ascending: false })
          .limit(LIMIT_SCREENS),
      ]);
      files = allFiles.data ?? [];
      documents = allDocs.data ?? [];
      screenshots = allScreens.data ?? [];
    } else {
      files = results[1].data ?? [];
      documents = results[2].data ?? [];
      screenshots = results[3].data ?? [];
    }

    const fileIds = (files ?? []).map((f) => f.storage_path);
    const urlResults = await Promise.all(
      fileIds.map(async (path) => {
        const { data } = await db.storage.from("client-files").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedClientFiles = Object.fromEntries(urlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    const docPaths = (documents ?? []).map((d) => d.storage_path);
    const docUrlResults = await Promise.all(
      docPaths.map(async (path) => {
        const { data } = await db.storage.from("client-documents").createSignedUrl(path, 60 * 60);
        return { path, url: data?.signedUrl ?? "" };
      }),
    );
    signedClientDocs = Object.fromEntries(docUrlResults.filter((x) => x.url).map((x) => [x.path, x.url]));

    const reportPaths = (screenshots ?? []).map((r) => r.screenshot_path);
    const reportUrlResults = await Promise.all(
      reportPaths.map(async (path) => {
        const { data } = await db.storage.from("activity-reports").createSignedUrl(path, 60 * 60);
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
        const { data: owners } = await db.from("profiles").select("id,full_name,role").in("id", ownerIds as string[]);
        ownersById = Object.fromEntries(
          (owners ?? []).map((o) => [o.id, { full_name: o.full_name ?? null, role: (o.role as Role | null) ?? null }]),
        );
      }

      const { data: archiveUsers } = await db
        .from("profiles")
        .select("id,full_name,role")
        .in("role", ["commercial", "marketing", "dev", "designer"])
        .order("role")
        .order("full_name");
      userOptions = (archiveUsers ?? []) as Array<{ id: string; full_name: string | null; role: Role }>;
    }

    const projectIds = Array.from(new Set((screenshots ?? []).map((r) => r.project_id).filter(Boolean)));
    if (projectIds.length) {
      const { data: projects } = await db.from("projects").select("id,nom").in("id", projectIds as string[]);
      projectsById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.nom]));
    }

    clientsById = Object.fromEntries((clients ?? []).map((c) => [c.id, c.nom]));
  }

  const groupKeyForClient = (clientId: string) => clientsById[clientId] ?? clientId;
  const selectedUserLabel =
    isAdmin && qp.user ? ownersById[qp.user]?.full_name ?? ownersById[qp.user]?.role ?? qp.user : null;
  const selectedUserRole = isAdmin && qp.user ? ownersById[qp.user]?.role ?? null : null;
  const ownerIdsInArchive = isAdmin && !qp.user
    ? Array.from(
        new Set(
          [
            ...(files ?? []).map((f) => (f as unknown as { owner_id?: string }).owner_id).filter(Boolean),
            ...(documents ?? []).map((d) => d.owner_id).filter(Boolean),
            ...(screenshots ?? []).map((r) => r.user_id).filter(Boolean),
          ].filter(Boolean),
        ),
      ) as string[]
    : [];
  const ownerLabel = (id: string) => {
    const u = ownersById[id];
    const name = u?.full_name ?? id.slice(0, 8);
    const r = u?.role ? ` (${u.role})` : "";
    return `${name}${r}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{isAdmin ? "Archives (preuves)" : "Fichiers Clients"}</h1>
          {isAdmin ? (
            <p className="text-sm text-zinc-500">
              {qp.user
                ? `Filtre utilisateur: ${selectedUserLabel ?? qp.user}${selectedUserRole ? ` (${selectedUserRole})` : ""}`
                : "Tous les utilisateurs"}
            </p>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/storage" className="inline-flex">
              <span className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85">
                Tous
              </span>
            </Link>
            {userOptions.slice(0, 16).map((c) => (
              <Link key={c.id} href={`/app/storage?user=${encodeURIComponent(c.id)}`} className="inline-flex">
                <span className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85">
                  {(c.full_name ?? c.id.slice(0, 8)).toLowerCase()} ({c.role})
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {!isAdmin ? (
        <Card>
          <h2 className="mb-3 font-semibold">Uploader un fichier</h2>
          <ClientFilesUploader clients={clients ?? []} />
        </Card>
      ) : null}

      {isAdmin && !qp.user ? (
        <div className="space-y-4">
          {ownerIdsInArchive.map((ownerId) => {
            const userFiles = (files ?? []).filter((f) => (f as unknown as { owner_id?: string }).owner_id === ownerId);
            const userDocs = (documents ?? []).filter((d) => d.owner_id === ownerId);
            const userScreens = (screenshots ?? []).filter((s) => s.user_id === ownerId);

            return (
              <Card key={ownerId} className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">{ownerLabel(ownerId)}</h2>
                  <p className="text-sm text-zinc-500">
                    {userFiles.length} fichiers, {userDocs.length} documents, {userScreens.length} captures
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Fichiers</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {userFiles.map((file) => {
                      const signedUrl = !isDemoMode ? signedClientFiles[file.storage_path] ?? "" : file.storage_path;
                      const image = file.mime_type?.startsWith("image/");
                      const clientName = groupKeyForClient((file as unknown as { client_id: string }).client_id);
                      return (
                        <Card key={file.id} className="space-y-2">
                          {image ? (
                            <ImageViewer
                              src={signedUrl}
                              alt={file.file_name}
                              width={520}
                              height={320}
                              className="h-36 w-full overflow-hidden rounded-md"
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                              Apercu indisponible
                            </div>
                          )}
                          <p className="truncate text-sm font-medium">{file.file_name}</p>
                          <p className="truncate text-xs text-zinc-500">{clientName}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Documents identite</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {userDocs.map((doc) => {
                      const signedUrl = !isDemoMode ? signedClientDocs[doc.storage_path] ?? "" : doc.storage_path;
                      const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
                      const clientName = groupKeyForClient(doc.client_id);
                      return (
                        <Card key={doc.id} className="space-y-2">
                          {isImage && signedUrl ? (
                            <ImageViewer
                              src={signedUrl}
                              alt={doc.file_name}
                              width={520}
                              height={320}
                              className="h-36 w-full overflow-hidden rounded-md"
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                              Apercu indisponible
                            </div>
                          )}
                          <p className="truncate text-sm font-medium">{doc.doc_type.replaceAll("_", " ").toUpperCase()}</p>
                          <p className="truncate text-xs text-zinc-500">{clientName}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Captures activite</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {userScreens.map((item) => {
                      const signedUrl = !isDemoMode
                        ? signedActivityReports[item.screenshot_path] ?? ""
                        : item.screenshot_path;
                      const projectName = projectsById[item.project_id] ?? item.project_id;
                      return (
                        <Card key={item.id} className="space-y-2">
                          {signedUrl ? (
                            <ImageViewer
                              src={signedUrl}
                              alt={item.description}
                              width={520}
                              height={320}
                              className="h-36 w-full overflow-hidden rounded-md"
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                              Apercu indisponible
                            </div>
                          )}
                          <p className="truncate text-sm font-medium">{projectName}</p>
                          <p className="truncate text-xs text-zinc-500">{item.description}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Fichiers (client-files)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(files ?? []).map((file) => {
                const signedUrl = !isDemoMode ? signedClientFiles[file.storage_path] ?? "" : file.storage_path;
                const image = file.mime_type?.startsWith("image/");
                const owner = isAdmin ? ownersById[(file as unknown as { owner_id: string }).owner_id] : null;
                const clientName = groupKeyForClient((file as unknown as { client_id: string }).client_id);

                return (
                  <Card key={file.id} className="space-y-2">
                    {image ? (
                      <ImageViewer
                        src={signedUrl}
                        alt={file.file_name}
                        width={520}
                        height={320}
                        className="h-36 w-full overflow-hidden rounded-md"
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                        Apercu indisponible
                      </div>
                    )}
                    <p className="truncate text-sm font-medium">{file.file_name}</p>
                    <p className="truncate text-xs text-zinc-500">{clientName}</p>
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
                const signedUrl = !isDemoMode ? signedClientDocs[doc.storage_path] ?? "" : doc.storage_path;
                const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
                const owner = isAdmin ? ownersById[doc.owner_id] : null;
                const clientName = groupKeyForClient(doc.client_id);

                return (
                  <Card key={doc.id} className="space-y-2">
                    {isImage && signedUrl ? (
                      <ImageViewer
                        src={signedUrl}
                        alt={doc.file_name}
                        width={520}
                        height={320}
                        className="h-36 w-full overflow-hidden rounded-md"
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                        Apercu indisponible
                      </div>
                    )}
                    <p className="truncate text-sm font-medium">{doc.doc_type.replaceAll("_", " ").toUpperCase()}</p>
                    <p className="truncate text-xs text-zinc-500">{doc.file_name}</p>
                    <p className="truncate text-xs text-zinc-500">{clientName}</p>
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
                const signedUrl = !isDemoMode
                  ? signedActivityReports[item.screenshot_path] ?? ""
                  : item.screenshot_path;
                const owner = isAdmin ? ownersById[item.user_id] : null;
                const projectName = projectsById[item.project_id] ?? item.project_id;

                return (
                  <Card key={item.id} className="space-y-2">
                    {signedUrl ? (
                      <ImageViewer
                        src={signedUrl}
                        alt={item.description}
                        width={520}
                        height={320}
                        className="h-36 w-full overflow-hidden rounded-md"
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
        </>
      )}
    </div>
  );
}
