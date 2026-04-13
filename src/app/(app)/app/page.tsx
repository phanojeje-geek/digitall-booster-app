import { Card } from "@/components/ui/card";
import { Activity, BriefcaseBusiness, CheckCircle2, Users } from "lucide-react";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockNotifications, mockProjects, mockReports } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

type MetricKey = "clients" | "projects" | "reports" | "activity";

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon size={16} />
        </div>
      </div>
    </Card>
  );
}

function getRoleTitle(role: Role) {
  if (role === "admin") return "Vue Admin";
  if (role === "commercial") return "Vue Commercial";
  if (role === "marketing") return "Vue Marketing";
  if (role === "designer") return "Vue Design";
  return "Vue Developpement";
}

function getRoleMetricKeys(role: Role) {
  if (role === "admin") return ["clients", "projects", "reports", "activity"] as MetricKey[];
  if (role === "commercial") return ["clients", "projects", "reports"] as MetricKey[];
  if (role === "marketing") return ["projects", "reports", "activity"] as MetricKey[];
  return ["projects", "reports", "activity"] as MetricKey[];
}

type RoleWidgetData = {
  clientsStatus: { prospect: number; enCours: number; client: number };
  projectsStatus: { enAttente: number; enCours: number; termine: number };
  reportsStatus: { enCours: number; termine: number };
};

function toRoleWidgetData(input: {
  clientsStatusRows: Array<{ statut: string }>;
  projectsStatusRows: Array<{ statut: string }>;
  reportsStatusRows: Array<{ status: string }>;
}): RoleWidgetData {
  const clientsStatus = { prospect: 0, enCours: 0, client: 0 };
  for (const row of input.clientsStatusRows) {
    if (row.statut === "prospect") clientsStatus.prospect += 1;
    if (row.statut === "en cours") clientsStatus.enCours += 1;
    if (row.statut === "client") clientsStatus.client += 1;
  }

  const projectsStatus = { enAttente: 0, enCours: 0, termine: 0 };
  for (const row of input.projectsStatusRows) {
    if (row.statut === "en attente") projectsStatus.enAttente += 1;
    if (row.statut === "en cours") projectsStatus.enCours += 1;
    if (row.statut === "termine") projectsStatus.termine += 1;
  }

  const reportsStatus = { enCours: 0, termine: 0 };
  for (const row of input.reportsStatusRows) {
    if (row.status === "en cours") reportsStatus.enCours += 1;
    if (row.status === "termine") reportsStatus.termine += 1;
  }

  return { clientsStatus, projectsStatus, reportsStatus };
}

function RoleWidgets({ role, data }: { role: Role; data: RoleWidgetData }) {
  if (role === "commercial") {
    const totalClients = data.clientsStatus.prospect + data.clientsStatus.enCours + data.clientsStatus.client;
    const conversionRate = totalClients ? Math.round((data.clientsStatus.client / totalClients) * 100) : 0;
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Pipeline Commercial</h2>
          <div className="space-y-2 text-sm">
            <p>Prospects: {data.clientsStatus.prospect}</p>
            <p>En cours: {data.clientsStatus.enCours}</p>
            <p>Clients signes: {data.clientsStatus.client}</p>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Conversion</h2>
          <p className="text-3xl font-semibold text-zinc-900 dark:text-white">{conversionRate}%</p>
          <p className="mt-1 text-sm text-zinc-500">Taux de conversion prospects vers clients.</p>
        </Card>
      </div>
    );
  }

  const totalReports = data.reportsStatus.enCours + data.reportsStatus.termine;
  const doneRate = totalReports ? Math.round((data.reportsStatus.termine / totalReports) * 100) : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Performance Equipe</h2>
        <div className="space-y-2 text-sm">
          <p>Projets en cours: {data.projectsStatus.enCours}</p>
          <p>Rapports en cours: {data.reportsStatus.enCours}</p>
          <p>Rapports termines: {data.reportsStatus.termine}</p>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Taux de Completion</h2>
        <p className="text-3xl font-semibold text-zinc-900 dark:text-white">{doneRate}%</p>
        <p className="mt-1 text-sm text-zinc-500">Part des rapports termines sur le total.</p>
      </Card>
    </div>
  );
}

type AdminAnalytics = {
  byTeam: Array<{ team: "dev" | "marketing" | "designer"; users: number; reports: number }>;
  byUser: Array<{ user: string; reports: number }>;
  projectProgress: Array<{ project: string; progress: number }>;
};

function AdminWidgets({ analytics }: { analytics: AdminAnalytics }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {analytics.byTeam.map((item) => (
          <Card key={item.team}>
            <h2 className="mb-1 text-base font-semibold capitalize">{item.team}</h2>
            <p className="text-sm text-zinc-500">Utilisateurs: {item.users}</p>
            <p className="text-sm text-zinc-500">Rapports: {item.reports}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Activite par utilisateur</h2>
          <div className="space-y-2 text-sm">
            {analytics.byUser.map((item) => (
              <p key={item.user}>
                {item.user}: {item.reports} rapports
              </p>
            ))}
            {analytics.byUser.length === 0 ? <p className="text-zinc-500">Aucune activite.</p> : null}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Progression projets</h2>
          <div className="space-y-2 text-sm">
            {analytics.projectProgress.map((item) => (
              <p key={item.project}>
                {item.project}: {item.progress}%
              </p>
            ))}
            {analytics.projectProgress.length === 0 ? <p className="text-zinc-500">Aucun projet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const role: Role = profile?.role ?? "dev";
  const metricKeys = getRoleMetricKeys(role);
  const isAdmin = role === "admin";

  if (isDemoMode) {
    const reportsOpen = mockReports.filter((report) => report.status === "en cours");
    const roleData = toRoleWidgetData({
      clientsStatusRows: mockClients.map((client) => ({ statut: client.statut })),
      projectsStatusRows: mockProjects.map((project) => ({ statut: project.statut })),
      reportsStatusRows: mockReports.map((report) => ({ status: report.status })),
    });

    const adminAnalytics: AdminAnalytics = {
      byTeam: [
        { team: "dev", users: 1, reports: 2 },
        { team: "marketing", users: 0, reports: 0 },
        { team: "designer", users: 0, reports: 0 },
      ],
      byUser: [{ user: "Demo User", reports: mockReports.length }],
      projectProgress: mockProjects.map((project) => ({
        project: project.nom,
        progress: project.statut === "termine" ? 100 : project.statut === "en cours" ? 60 : 20,
      })),
    };

    return (
      <div className="space-y-5">
        {params.forbidden ? (
          <Card className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Acces refuse a ce module pour votre role.
          </Card>
        ) : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-500">{getRoleTitle(role)}: suivi de performance par activite.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricKeys.includes("clients") ? (
            <MetricCard label="Clients" value={mockClients.length} icon={Users} />
          ) : null}
          {metricKeys.includes("projects") ? (
            <MetricCard label="Projets" value={mockProjects.length} icon={BriefcaseBusiness} />
          ) : null}
          {metricKeys.includes("reports") ? (
            <MetricCard label="Rapports en cours" value={reportsOpen.length} icon={CheckCircle2} />
          ) : null}
          {metricKeys.includes("activity") ? (
            <MetricCard label="Activite recente" value={mockNotifications.length} icon={Activity} />
          ) : null}
        </div>
        <RoleWidgets role={role} data={roleData} />
        {isAdmin ? <AdminWidgets analytics={adminAnalytics} /> : null}
      </div>
    );
  }

  const supabase = await createClient();

  const clientsQuery = isAdmin
    ? supabase.from("clients").select("id", { count: "exact", head: true })
    : supabase.from("clients").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  const projectsQuery = isAdmin
    ? supabase.from("projects").select("id", { count: "exact", head: true })
    : supabase.from("projects").select("id", { count: "exact", head: true }).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
  const reportsQuery = isAdmin
    ? supabase.from("activity_reports").select("id", { count: "exact", head: true }).eq("status", "en cours")
    : supabase
        .from("activity_reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "en cours");
  const activityQuery = isAdmin
    ? supabase.from("activity_reports").select("id,description,created_at").order("created_at", { ascending: false }).limit(5)
    : supabase
        .from("activity_reports")
        .select("id,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

  const [clients, projects, reports, activity] = await Promise.all([
    clientsQuery,
    projectsQuery,
    reportsQuery,
    activityQuery,
  ]);

  const clientsStatusQuery = isAdmin
    ? supabase.from("clients").select("statut")
    : supabase.from("clients").select("statut").eq("owner_id", user.id);
  const projectsStatusQuery = isAdmin
    ? supabase.from("projects").select("statut")
    : supabase.from("projects").select("statut").or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
  const reportsStatusQuery = isAdmin
    ? supabase.from("activity_reports").select("status")
    : supabase.from("activity_reports").select("status").eq("user_id", user.id);

  const [clientsStatusRows, projectsStatusRows, reportsStatusRows] = await Promise.all([
    clientsStatusQuery,
    projectsStatusQuery,
    reportsStatusQuery,
  ]);

  const roleData = toRoleWidgetData({
    clientsStatusRows: (clientsStatusRows.data ?? []) as Array<{ statut: string }>,
    projectsStatusRows: (projectsStatusRows.data ?? []) as Array<{ statut: string }>,
    reportsStatusRows: (reportsStatusRows.data ?? []) as Array<{ status: string }>,
  });

  let adminAnalytics: AdminAnalytics | null = null;
  if (isAdmin) {
    const [{ data: usersRows }, { data: reportRows }, { data: projectRows }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role"),
      supabase.from("activity_reports").select("user_id,project_id,status"),
      supabase.from("projects").select("id,nom"),
    ]);

    const users = usersRows ?? [];
    const reportsAll = reportRows ?? [];
    const projectsAll = projectRows ?? [];

    const teams: Array<"dev" | "marketing" | "designer"> = ["dev", "marketing", "designer"];
    const byTeam = teams.map((team) => ({
      team,
      users: users.filter((u) => u.role === team).length,
      reports: reportsAll.filter((r) => users.some((u) => u.id === r.user_id && u.role === team)).length,
    }));

    const byUser = users
      .map((u) => ({
        user: u.full_name || u.id,
        reports: reportsAll.filter((r) => r.user_id === u.id).length,
      }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 8);

    const projectProgress = projectsAll.map((project) => {
      const list = reportsAll.filter((r) => r.project_id === project.id);
      const done = list.filter((r) => r.status === "termine").length;
      const progress = list.length ? Math.round((done / list.length) * 100) : 0;
      return { project: project.nom, progress };
    });

    adminAnalytics = { byTeam, byUser, projectProgress };
  }

  return (
    <div className="space-y-5">
      {params.forbidden ? (
        <Card className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Acces refuse a ce module pour votre role.
        </Card>
      ) : null}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500">{getRoleTitle(role)}: suivi de performance par activite.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricKeys.includes("clients") ? <MetricCard label="Clients" value={clients.count ?? 0} icon={Users} /> : null}
        {metricKeys.includes("projects") ? (
          <MetricCard label="Projets" value={projects.count ?? 0} icon={BriefcaseBusiness} />
        ) : null}
        {metricKeys.includes("reports") ? (
          <MetricCard label="Rapports en cours" value={reports.count ?? 0} icon={CheckCircle2} />
        ) : null}
        {metricKeys.includes("activity") ? (
          <MetricCard label="Activite recente" value={activity.data?.length ?? 0} icon={Activity} />
        ) : null}
      </div>
      <RoleWidgets role={role} data={roleData} />
      {isAdmin && adminAnalytics ? <AdminWidgets analytics={adminAnalytics} /> : null}
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Fil d activite</h2>
        <div className="space-y-2">
          {(activity.data ?? []).map((item) => (
            <div key={item.id} className="rounded-xl bg-zinc-100 p-2.5 text-sm dark:bg-zinc-900">
              {item.description}
            </div>
          ))}
          {!activity.data?.length ? <p className="text-sm text-zinc-500">Aucune activite.</p> : null}
        </div>
      </Card>
    </div>
  );
}
