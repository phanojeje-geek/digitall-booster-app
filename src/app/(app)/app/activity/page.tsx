import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
};

export default async function ActivityPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

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
      : supabase
          .from("activity_reports")
          .select("id,project_id,user_id,description,screenshot_path,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

    const [{ data: projectsData }, { data: reportsData }] = await Promise.all([projectsQuery, reportsQuery]);
    projects = (projectsData ?? []) as ProjectRow[];
    reports = (reportsData ?? []) as ReportRow[];
  }

  const projectNameById = Object.fromEntries(projects.map((project) => [project.id, project.nom]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rapports d activite</h1>
        <p className="text-sm text-zinc-500">
          Publiez le travail effectue par projet avec capture obligatoire et statut d avancement.
        </p>
      </div>

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

      <div className="grid gap-3">
        {reports.map((report) => {
          const screenshotUrl = isDemoMode
            ? report.screenshot_path
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-reports/${report.screenshot_path}`;
          return (
            <Card key={report.id} className="grid gap-3 md:grid-cols-[180px_1fr]">
              <Image
                src={screenshotUrl}
                alt="Capture du rapport"
                width={180}
                height={120}
                className="h-32 w-full rounded-xl object-cover"
              />
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
