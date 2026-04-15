import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageViewer } from "@/components/image-viewer";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockProjects, mockReports } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import { createActivityReportAction } from "@/features/activity-reports/actions";

type ProjectRow = { id: string; nom: string; owner_id: string; assigned_to: string | null };
type ReportRow = {
  id: string;
  project_id: string;
  user_id: string;
  description: string;
  screenshot_path: string;
  status: "en cours" | "termine";
  created_at: string;
  signed_url?: string | null;
};

export default async function ActivityPage() {
  const LIMIT_REPORTS = 12;

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const isCommercial = profile?.role === "commercial";
  if (isCommercial) {
    redirect("/app?forbidden=1");
  }

  let projects: ProjectRow[] = [];
  let reports: ReportRow[] = [];

  if (isDemoMode) {
    projects = mockProjects.map((project) => ({
      id: project.id,
      nom: project.nom,
      owner_id: project.owner_id,
      assigned_to: project.assigned_to,
    }));
    reports = mockReports;
  } else {
    const supabase = await createClient();

    const projectsQuery = isAdmin
      ? supabase.from("projects").select("id,nom,owner_id,assigned_to").order("created_at", { ascending: false })
      : supabase
          .from("projects")
          .select("id,nom,owner_id,assigned_to")
          .or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`)
          .order("created_at", { ascending: false });

    const reportsQuery = isAdmin
      ? supabase
          .from("activity_reports")
          .select("id,project_id,user_id,description,screenshot_path,status,created_at")
          .order("created_at", { ascending: false })
          .limit(LIMIT_REPORTS)
      : supabase
          .from("activity_reports")
          .select("id,project_id,user_id,description,screenshot_path,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(LIMIT_REPORTS);

    const [{ data: projectsData }, { data: reportsData }] = await Promise.all([projectsQuery, reportsQuery]);
    projects = (projectsData ?? []) as ProjectRow[];
    const rawReports = (reportsData ?? []) as ReportRow[];
    const signed = await Promise.all(
      rawReports.map(async (report) => {
        const { data } = await supabase.storage.from("activity-reports").createSignedUrl(report.screenshot_path, 60 * 60);
        return { ...report, signed_url: data?.signedUrl ?? null };
      }),
    );
    reports = signed;
  }

  const projectNameById = Object.fromEntries(projects.map((project) => [project.id, project.nom]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rapports d activite</h1>
        <p className="text-sm text-zinc-500">
          {isAdmin
            ? "Vue admin: consultez tous les rapports et preuves envoyes par les equipes."
            : "Publiez le travail effectue par projet avec capture obligatoire et statut d avancement."}
        </p>
      </div>

      {!isAdmin ? (
        <Card>
          <h2 className="mb-3 font-semibold">Nouveau rapport</h2>
          <form action={createActivityReportAction} className="grid gap-3 md:grid-cols-2">
            <select
              name="project_id"
              required
              className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Selectionner un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.nom}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue="en cours"
              className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="en cours">en cours</option>
              <option value="termine">termine</option>
            </select>
            <textarea
              name="description"
              required
              className="min-h-28 rounded-lg border border-zinc-200/80 bg-white/90 p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:col-span-2"
              placeholder="Decrivez le travail effectue..."
            />
            <Input name="screenshot" type="file" accept="image/*" required className="md:col-span-2" />
            <Button type="submit" variant="primary">
              Publier le rapport
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {reports.map((report) => {
          const screenshotUrl = isDemoMode ? report.screenshot_path : report.signed_url ?? "";
          return (
            <Card key={report.id} className="grid gap-3 md:grid-cols-[180px_1fr]">
              {screenshotUrl ? (
                <ImageViewer
                  src={screenshotUrl}
                  alt="Capture du rapport"
                  width={900}
                  height={600}
                  className="h-32 w-full overflow-hidden rounded-xl"
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-900">
                  Apercu indisponible
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium uppercase dark:bg-zinc-800">
                    {report.status}
                  </span>
                  <span className="text-xs text-zinc-500">{new Date(report.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <p className="text-sm font-medium">{projectNameById[report.project_id] ?? "Projet"}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{report.description}</p>
              </div>
            </Card>
          );
        })}
        {reports.length === 0 ? <Card>Aucun rapport pour le moment.</Card> : null}
      </div>
    </div>
  );
}
