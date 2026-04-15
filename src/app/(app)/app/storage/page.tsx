import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientFilesUploader } from "@/components/uploaders";
import { ImageViewer } from "@/components/image-viewer";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockFiles } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

type FileRow = {
  id: string;
  owner_id: string;
  client_id: string;
  file_name: string;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
};

type DocumentRow = {
  id: string;
  owner_id: string;
  client_id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

type ScreenshotRow = {
  id: string;
  user_id: string;
  project_id: string;
  description: string;
  screenshot_path: string;
  created_at: string;
};

export default async function StoragePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; q?: string }>;
}) {
  const LIMIT_FILES = 60;
  const LIMIT_DOCS = 60;
  const LIMIT_SCREENS = 60;

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const role: Role = profile?.role ?? "dev";
  const isAdmin = role === "admin";
  const isCommercial = role === "commercial";
  if (!isAdmin && !isCommercial) {
    redirect("/app?forbidden=1");
  }
  const qp = await searchParams;
  let clients = mockClients.map((c) => ({ id: c.id, nom: c.nom }));
  let files: FileRow[] = isDemoMode ? ((mockFiles as unknown) as FileRow[]) : [];
  let documents: DocumentRow[] = [];
  let screenshots: ScreenshotRow[] = [];
  let signedClientFiles: Record<string, string> = {};
  let signedClientDocs: Record<string, string> = {};
  let signedActivityReports: Record<string, string> = {};
  let projectsById: Record<string, string> = {};
  let clientsById: Record<string, string> = {};
  let userOptions: Array<{ id: string; full_name: string | null; role: Role }> = [];
  let selectedUser: { id: string; full_name: string | null; role: Role } | null = null;

  if (!isDemoMode) {
    const db = isAdmin ? createAdminClient() : await createClient();
    if (isAdmin) {
      const { data: archiveUsers } = await db
        .from("profiles")
        .select("id,full_name,role")
        .in("role", ["commercial", "marketing", "dev", "designer"])
        .order("role")
        .order("full_name");
      userOptions = (archiveUsers ?? []) as Array<{ id: string; full_name: string | null; role: Role }>;

      if (qp.user) {
        const { data } = await db.from("profiles").select("id,full_name,role").eq("id", qp.user).maybeSingle();
        if (data?.id) {
          selectedUser = {
            id: data.id,
            full_name: (data.full_name as string | null) ?? null,
            role: (data.role as Role) ?? "dev",
          };
        }
      }
    }

    if (!isAdmin) {
      const { data: c } = await db.from("clients").select("id,nom").eq("owner_id", user.id).order("nom");
      clients = c ?? [];
      clientsById = Object.fromEntries((clients ?? []).map((x) => [x.id, x.nom]));

      const [{ data: f }, { data: d }] = await Promise.all([
        db
          .from("files_index")
          .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(LIMIT_FILES),
        db
          .from("client_documents")
          .select("id,owner_id,client_id,doc_type,file_name,storage_path,created_at")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(LIMIT_DOCS),
      ]);
      files = (f ?? []) as FileRow[];
      documents = (d ?? []) as DocumentRow[];
    }

    if (isAdmin && selectedUser) {
      if (selectedUser.role === "commercial") {
        const [{ data: c }, { data: f }, { data: d }] = await Promise.all([
          db.from("clients").select("id,nom").eq("owner_id", selectedUser.id).order("nom"),
          db
            .from("files_index")
            .select("id,file_name,mime_type,storage_path,client_id,created_at,owner_id")
            .eq("owner_id", selectedUser.id)
            .order("created_at", { ascending: false })
            .limit(LIMIT_FILES),
          db
            .from("client_documents")
            .select("id,owner_id,client_id,doc_type,file_name,storage_path,created_at")
            .eq("owner_id", selectedUser.id)
            .order("created_at", { ascending: false })
            .limit(LIMIT_DOCS),
        ]);
        clients = c ?? [];
        clientsById = Object.fromEntries((clients ?? []).map((x) => [x.id, x.nom]));
        files = (f ?? []) as FileRow[];
        documents = (d ?? []) as DocumentRow[];

        const urls = await Promise.all(
          files.map(async (row) => {
            const { data } = await db.storage.from("client-files").createSignedUrl(row.storage_path, 60 * 60);
            return { path: row.storage_path, url: data?.signedUrl ?? "" };
          }),
        );
        signedClientFiles = Object.fromEntries(urls.filter((x) => x.url).map((x) => [x.path, x.url]));

        const docUrls = await Promise.all(
          documents.map(async (row) => {
            const { data } = await db.storage.from("client-documents").createSignedUrl(row.storage_path, 60 * 60);
            return { path: row.storage_path, url: data?.signedUrl ?? "" };
          }),
        );
        signedClientDocs = Object.fromEntries(docUrls.filter((x) => x.url).map((x) => [x.path, x.url]));
      } else {
        const { data: s } = await db
          .from("activity_reports")
          .select("id,user_id,project_id,description,screenshot_path,created_at")
          .eq("user_id", selectedUser.id)
          .order("created_at", { ascending: false })
          .limit(LIMIT_SCREENS);
        screenshots = (s ?? []) as ScreenshotRow[];

        const projectIds = Array.from(new Set((screenshots ?? []).map((x) => x.project_id).filter(Boolean)));
        if (projectIds.length) {
          const { data: projects } = await db.from("projects").select("id,nom").in("id", projectIds as string[]);
          projectsById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.nom]));
        }

        const reportUrls = await Promise.all(
          screenshots.map(async (row) => {
            const { data } = await db.storage.from("activity-reports").createSignedUrl(row.screenshot_path, 60 * 60);
            return { path: row.screenshot_path, url: data?.signedUrl ?? "" };
          }),
        );
        signedActivityReports = Object.fromEntries(reportUrls.filter((x) => x.url).map((x) => [x.path, x.url]));
      }
    }
  }

  const groupKeyForClient = (clientId: string) => clientsById[clientId] ?? clientId;
  const selectedUserLabel = selectedUser ? selectedUser.full_name ?? selectedUser.id : null;
  const q = (qp.q ?? "").trim().toLowerCase();
  const matches = (value: string) => (q ? value.toLowerCase().includes(q) : true);
  const filteredFiles = q
    ? files.filter((f) => matches(f.file_name) || matches(groupKeyForClient(f.client_id)))
    : files;
  const filteredDocs = q
    ? documents.filter((d) => matches(d.file_name) || matches(d.doc_type) || matches(groupKeyForClient(d.client_id)))
    : documents;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{isAdmin ? "Archives (preuves)" : "Fichiers Clients"}</h1>
          {isAdmin ? (
            <p className="text-sm text-zinc-500">
              {selectedUser ? `Dossier: ${selectedUserLabel ?? selectedUser.id} (${selectedUser.role})` : "Dossiers"}
            </p>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/storage" className="inline-flex">
              <span className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85">
                Dossiers
              </span>
            </Link>
          </div>
        ) : null}
      </div>

      {!isAdmin ? (
        <Card className="mx-auto w-full max-w-3xl">
          <h2 className="mb-3 font-semibold">Téléverser un fichier</h2>
          <ClientFilesUploader clients={clients ?? []} />
        </Card>
      ) : null}

      {!isAdmin ? (
        <Card className="mx-auto w-full max-w-3xl">
          <h2 className="mb-3 font-semibold">Recherche</h2>
          <form className="flex flex-col gap-2 sm:flex-row">
            <Input name="q" defaultValue={qp.q ?? ""} placeholder="Rechercher par client ou nom de fichier..." />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              Filtrer
            </button>
          </form>
        </Card>
      ) : null}

      {isAdmin && !selectedUser ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Fichiers commerciaux</h2>
            <div className="flex flex-wrap gap-2">
              {userOptions
                .filter((u) => u.role === "commercial")
                .map((u) => (
                  <Link key={u.id} href={`/app/storage?user=${encodeURIComponent(u.id)}`} className="inline-flex">
                    <span className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85">
                      {(u.full_name ?? u.id.slice(0, 8)).toLowerCase()}
                    </span>
                  </Link>
                ))}
            </div>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-base font-semibold">Fichiers equipes (rapports)</h2>
            <div className="flex flex-wrap gap-2">
              {userOptions
                .filter((u) => u.role !== "commercial")
                .map((u) => (
                  <Link key={u.id} href={`/app/storage?user=${encodeURIComponent(u.id)}`} className="inline-flex">
                    <span className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85">
                      {(u.full_name ?? u.id.slice(0, 8)).toLowerCase()} ({u.role})
                    </span>
                  </Link>
                ))}
            </div>
          </Card>
        </div>
      ) : null}

      {isAdmin && selectedUser ? (
        selectedUser.role === "commercial" ? (
          <div className="space-y-4">
            {Array.from(new Set([...files.map((f) => f.client_id), ...documents.map((d) => d.client_id)].filter(Boolean))).map(
              (clientId) => {
                const clientName = groupKeyForClient(clientId);
                const clientFiles = files.filter((f) => f.client_id === clientId);
                const clientDocs = documents.filter((d) => d.client_id === clientId);
                const images = clientFiles.filter((f) => (f.mime_type ?? "").startsWith("image/"));
                const others = clientFiles.filter((f) => !(f.mime_type ?? "").startsWith("image/"));
                if (!clientFiles.length && !clientDocs.length) return null;

                return (
                  <details
                    key={clientId}
                    className="rounded-2xl border border-zinc-200/80 bg-white/92 p-4 text-zinc-900 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <summary className="cursor-pointer select-none text-base font-semibold">
                      {clientName} — {images.length} images, {clientDocs.length} documents
                    </summary>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Images</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {images.map((file) => {
                            const signedUrl = signedClientFiles[file.storage_path] ?? "";
                            const displayName = `${clientName} - ${file.file_name}`;
                            return (
                              <Card key={file.id} className="space-y-2">
                                {signedUrl ? (
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
                                <p className="truncate text-sm font-medium">{displayName}</p>
                              </Card>
                            );
                          })}
                        </div>
                      </div>

                      {others.length ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Autres fichiers</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {others.map((file) => {
                              const displayName = `${clientName} - ${file.file_name}`;
                              return (
                                <Card key={file.id} className="space-y-2">
                                  <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
                                    {file.mime_type ?? "Fichier"}
                                  </div>
                                  <p className="truncate text-sm font-medium">{displayName}</p>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Documents</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {clientDocs.map((doc) => {
                            const signedUrl = signedClientDocs[doc.storage_path] ?? "";
                            const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
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
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </details>
                );
              },
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(new Set(screenshots.map((s) => s.project_id).filter(Boolean))).map((projectId) => {
              const projectName = projectsById[projectId] ?? projectId;
              const shots = screenshots.filter((s) => s.project_id === projectId);
              if (!shots.length) return null;

              return (
                <details
                  key={projectId}
                  className="rounded-2xl border border-zinc-200/80 bg-white/92 p-4 text-zinc-900 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <summary className="cursor-pointer select-none text-base font-semibold">
                    {projectName} — {shots.length} captures
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {shots.map((item) => {
                      const signedUrl = signedActivityReports[item.screenshot_path] ?? "";
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
                          <p className="truncate text-xs text-zinc-500">{item.description}</p>
                        </Card>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )
      ) : null}

      {!isAdmin ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Mes fichiers</h2>
          {Array.from(
            new Set([...filteredFiles.map((f) => f.client_id), ...filteredDocs.map((d) => d.client_id)].filter(Boolean)),
          ).map((clientId) => {
            const clientName = groupKeyForClient(clientId);
            const clientFiles = filteredFiles.filter((f) => f.client_id === clientId);
            const clientDocs = filteredDocs.filter((d) => d.client_id === clientId);
            if (!clientFiles.length && !clientDocs.length) return null;

            const images = clientFiles.filter((f) => (f.mime_type ?? "").startsWith("image/"));
            const others = clientFiles.filter((f) => !(f.mime_type ?? "").startsWith("image/"));

            return (
              <details
                key={clientId}
                className="rounded-2xl border border-zinc-200/80 bg-white/92 p-4 text-zinc-900 shadow-sm backdrop-blur-sm"
                open={Boolean(q)}
              >
                <summary className="cursor-pointer select-none text-base font-semibold">
                  {clientName} — {images.length} images, {clientDocs.length} documents, {others.length} autres
                </summary>
                <div className="mt-4 space-y-4">
                  {images.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Images</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {images.map((file) => {
                          return (
                            <Card key={file.id} className="space-y-2">
                              <ImageViewer
                                bucket="client-files"
                                path={file.storage_path}
                                alt={file.file_name}
                                width={520}
                                height={320}
                                className="h-36 w-full overflow-hidden rounded-md"
                              />
                              <p className="truncate text-sm font-medium">{file.file_name}</p>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {clientDocs.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Documents</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {clientDocs.map((doc) => {
                          const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
                          return (
                            <Card key={doc.id} className="space-y-2">
                              {isImage ? (
                                <ImageViewer
                                  bucket="client-documents"
                                  path={doc.storage_path}
                                  alt={doc.file_name}
                                  width={520}
                                  height={320}
                                  className="h-36 w-full overflow-hidden rounded-md"
                                />
                              ) : (
                                <div className="flex h-36 items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500">
                                  Aperçu indisponible
                                </div>
                              )}
                              <p className="truncate text-sm font-medium">{doc.doc_type.replaceAll("_", " ")}</p>
                              <p className="truncate text-xs text-zinc-500">{doc.file_name}</p>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {others.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Autres fichiers</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {others.map((file) => (
                          <Card key={file.id} className="space-y-2">
                            <div className="flex h-20 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500">
                              {file.mime_type ?? "fichier"}
                            </div>
                            <p className="truncate text-sm font-medium">{file.file_name}</p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
          {filteredFiles.length === 0 && filteredDocs.length === 0 ? (
            <Card className="mx-auto w-full max-w-3xl">Aucun fichier trouvé.</Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
