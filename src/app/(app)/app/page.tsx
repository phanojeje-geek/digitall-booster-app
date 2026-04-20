import { Card } from "@/components/ui/card";
import { Activity, BriefcaseBusiness, CheckCircle2, Users } from "lucide-react";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockNotifications, mockProjects, mockReports } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
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
  if (role === "commercial") return ["clients"] as MetricKey[];
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
  if (role === "commercial") return null;

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

function AdminWidgets({
  analytics,
  commercialStats,
}: {
  analytics: AdminAnalytics;
  commercialStats: Array<{ name: string; count: number; revenue: number }>;
}) {
  const totalRevenue = commercialStats.reduce((sum, s) => sum + s.revenue, 0);
  const maxClients = Math.max(...commercialStats.map((s) => s.count), 1);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-linear-to-br from-indigo-600 to-violet-700 text-white">
          <p className="text-sm opacity-80">Chiffre d'Affaires Global</p>
          <p className="text-3xl font-bold">{totalRevenue.toLocaleString("fr-FR")} FCFA</p>
          <p className="mt-1 text-xs opacity-60">Basé sur les abonnements validés</p>
        </Card>
        <Card className="bg-linear-to-br from-emerald-600 to-teal-700 text-white">
          <p className="text-sm opacity-80">Meilleur Commercial</p>
          <p className="text-3xl font-bold">{commercialStats[0]?.name || "N/A"}</p>
          <p className="mt-1 text-xs opacity-60">{commercialStats[0]?.count || 0} clients enregistrés</p>
        </Card>
        <Card className="bg-linear-to-br from-amber-500 to-orange-600 text-white">
          <p className="text-sm opacity-80">Taux de Conversion</p>
          <p className="text-3xl font-bold">{Math.round((analytics.projectProgress.length / (commercialStats.length || 1)) * 10)}%</p>
          <p className="mt-1 text-xs opacity-60">Projets vs Prospects</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
            <Users className="text-indigo-500" size={18} />
            Performance des Commerciaux
          </h2>
          <div className="space-y-4">
            {commercialStats.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.name}</span>
                  <span className="text-zinc-500">{item.count} clients</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${(item.count / maxClients) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {commercialStats.length === 0 ? <p className="text-zinc-500 text-sm">Aucune donnée commerciale.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
            <Activity className="text-emerald-500" size={18} />
            Progression des Projets
          </h2>
          <div className="space-y-4">
            {analytics.projectProgress.slice(0, 5).map((item) => (
              <div key={item.project} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.project}</span>
                  <span className="text-zinc-500">{item.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.projectProgress.length === 0 ? <p className="text-zinc-500 text-sm">Aucun projet en cours.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string; debug?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const role: Role = profile?.role ?? "dev";
  const metricKeys = getRoleMetricKeys(role);
  const isAdmin = role === "admin";
  const debug = params.debug === "1" || params.debug === "true";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseProjectRef = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co\/?$/)?.[1] ?? "inconnu";
  const anonKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const vercelCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  let rlsProfileDebug:
    | { ok: true; id: string | null; role: string | null; email: string | null }
    | { ok: false; error: string } = { ok: true, id: null, role: null, email: null };
  let adminProfileDebug:
    | { ok: true; id: string | null; role: string | null; email: string | null }
    | { ok: false; error: string } = { ok: true, id: null, role: null, email: null };

  if (debug && !isDemoMode) {
    const supabase = await createClient();
    const { data: rlsData, error: rlsError } = await supabase
      .from("profiles")
      .select("id,role,email")
      .eq("id", user.id)
      .maybeSingle();
    if (rlsError) {
      rlsProfileDebug = { ok: false, error: `${rlsError.code ?? ""} ${rlsError.message}`.trim() };
    } else {
      rlsProfileDebug = {
        ok: true,
        id: (rlsData?.id as string | null) ?? null,
        role: (rlsData?.role as string | null) ?? null,
        email: (rlsData?.email as string | null) ?? null,
      };
    }

    try {
      const admin = createAdminClient();
      const { data: adminData, error: adminError } = await admin
        .from("profiles")
        .select("id,role,email")
        .eq("id", user.id)
        .maybeSingle();
      if (adminError) {
        adminProfileDebug = { ok: false, error: `${adminError.code ?? ""} ${adminError.message}`.trim() };
      } else {
        adminProfileDebug = {
          ok: true,
          id: (adminData?.id as string | null) ?? null,
          role: (adminData?.role as string | null) ?? null,
          email: (adminData?.email as string | null) ?? null,
        };
      }
    } catch (error) {
      adminProfileDebug = {
        ok: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

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
        {debug ? (
          <Card className="border-dashed border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <h2 className="mb-2 text-base font-semibold">Debug Auth</h2>
            <div className="space-y-1 text-sm">
              <p>isDemoMode: {String(isDemoMode)}</p>
              <p>supabaseProjectRef: {supabaseProjectRef}</p>
              <p>anonKeySet: {String(anonKeySet)}</p>
              <p>serviceRoleKeySet: {String(serviceRoleKeySet)}</p>
              <p>userId: {user.id}</p>
              <p>userEmail: {(user as unknown as { email?: string }).email ?? "inconnu"}</p>
              <p>profileId: {profile?.id ?? "null"}</p>
              <p>profileRole: {profile?.role ?? "null"}</p>
              <p>profileEmail: {profile?.email ?? "null"}</p>
              <p>rlsProfile: {rlsProfileDebug.ok ? "ok" : "error"}</p>
              <p>rlsProfileId: {rlsProfileDebug.ok ? rlsProfileDebug.id ?? "null" : "n/a"}</p>
              <p>rlsProfileRole: {rlsProfileDebug.ok ? rlsProfileDebug.role ?? "null" : "n/a"}</p>
              <p>rlsProfileError: {rlsProfileDebug.ok ? "null" : rlsProfileDebug.error}</p>
              <p>adminProfile: {adminProfileDebug.ok ? "ok" : "error"}</p>
              <p>adminProfileId: {adminProfileDebug.ok ? adminProfileDebug.id ?? "null" : "n/a"}</p>
              <p>adminProfileRole: {adminProfileDebug.ok ? adminProfileDebug.role ?? "null" : "n/a"}</p>
              <p>adminProfileError: {adminProfileDebug.ok ? "null" : adminProfileDebug.error}</p>
              <p>vercelCommit: {vercelCommit ?? "n/a"}</p>
            </div>
          </Card>
        ) : null}
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
        {isAdmin ? (
          <AdminWidgets
            analytics={adminAnalytics}
            commercialStats={[
              { name: "Demo Commercial 1", count: 12, revenue: 60000 },
              { name: "Demo Commercial 2", count: 8, revenue: 45000 },
            ]}
          />
        ) : null}
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

  const clientsProspectQuery = supabase.from("clients").select("id", { count: "exact", head: true });
  const clientsEnCoursQuery = supabase.from("clients").select("id", { count: "exact", head: true });
  const clientsClientQuery = supabase.from("clients").select("id", { count: "exact", head: true });
  if (!isAdmin) {
    clientsProspectQuery.eq("owner_id", user.id);
    clientsEnCoursQuery.eq("owner_id", user.id);
    clientsClientQuery.eq("owner_id", user.id);
  }
  clientsProspectQuery.eq("statut", "prospect");
  clientsEnCoursQuery.eq("statut", "en cours");
  clientsClientQuery.eq("statut", "client");

  const projectsEnAttenteQuery = supabase.from("projects").select("id", { count: "exact", head: true });
  const projectsEnCoursQuery = supabase.from("projects").select("id", { count: "exact", head: true });
  const projectsTermineQuery = supabase.from("projects").select("id", { count: "exact", head: true });
  if (!isAdmin) {
    projectsEnAttenteQuery.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
    projectsEnCoursQuery.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
    projectsTermineQuery.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
  }
  projectsEnAttenteQuery.eq("statut", "en attente");
  projectsEnCoursQuery.eq("statut", "en cours");
  projectsTermineQuery.eq("statut", "termine");

  const reportsEnCoursQuery = supabase.from("activity_reports").select("id", { count: "exact", head: true }).eq("status", "en cours");
  const reportsTermineQuery = supabase.from("activity_reports").select("id", { count: "exact", head: true }).eq("status", "termine");
  if (!isAdmin) {
    reportsEnCoursQuery.eq("user_id", user.id);
    reportsTermineQuery.eq("user_id", user.id);
  }

  const [clientsProspect, clientsEnCours, clientsClient, projectsEnAttente, projectsEnCours, projectsTermine, reportsEnCours, reportsTermine] =
    await Promise.all([
      clientsProspectQuery,
      clientsEnCoursQuery,
      clientsClientQuery,
      projectsEnAttenteQuery,
      projectsEnCoursQuery,
      projectsTermineQuery,
      reportsEnCoursQuery,
      reportsTermineQuery,
    ]);

  const roleData: RoleWidgetData = {
    clientsStatus: {
      prospect: clientsProspect.count ?? 0,
      enCours: clientsEnCours.count ?? 0,
      client: clientsClient.count ?? 0,
    },
    projectsStatus: {
      enAttente: projectsEnAttente.count ?? 0,
      enCours: projectsEnCours.count ?? 0,
      termine: projectsTermine.count ?? 0,
    },
    reportsStatus: {
      enCours: reportsEnCours.count ?? 0,
      termine: reportsTermine.count ?? 0,
    },
  };

  let adminAnalytics: AdminAnalytics | null = null;
  let commercialStats: Array<{ name: string; count: number; revenue: number }> = [];

  if (isAdmin) {
    const [{ data: usersRows }, { data: reportRows }, { data: projectRows }, { data: clientsRows }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("activity_reports")
        .select("user_id,project_id,status,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase.from("projects").select("id,nom").order("created_at", { ascending: false }).limit(500),
      supabase.from("clients").select("owner_id,subscription_type").limit(1000),
    ]);

    const users = (usersRows ?? []) as Array<{ id: string; full_name: string | null; role: string }>;
    const reportsAll = (reportRows ?? []) as Array<{ user_id: string; project_id: string; status: string }>;
    const projectsAll = (projectRows ?? []) as Array<{ id: string; nom: string }>;
    const clientsAll = (clientsRows ?? []) as Array<{ owner_id: string; subscription_type: string }>;

    const userRoleById = new Map(users.map((u) => [u.id, u.role]));
    const userNameById = new Map(users.map((u) => [u.id, u.full_name || u.id]));

    const teams: Array<"dev" | "marketing" | "designer"> = ["dev", "marketing", "designer"];
    const usersCountByTeam = new Map(teams.map((t) => [t, 0]));
    for (const u of users) {
      if (usersCountByTeam.has(u.role as (typeof teams)[number])) {
        usersCountByTeam.set(u.role as (typeof teams)[number], (usersCountByTeam.get(u.role as (typeof teams)[number]) ?? 0) + 1);
      }
    }

    const reportsCountByTeam = new Map(teams.map((t) => [t, 0]));
    const progressByProject = new Map<string, { total: number; done: number }>();
    for (const r of reportsAll) {
      const role = userRoleById.get(r.user_id);
      if (reportsCountByTeam.has(role as (typeof teams)[number])) {
        reportsCountByTeam.set(role as (typeof teams)[number], (reportsCountByTeam.get(role as (typeof teams)[number]) ?? 0) + 1);
      }
      const prev = progressByProject.get(r.project_id) ?? { total: 0, done: 0 };
      prev.total += 1;
      if (r.status === "termine") prev.done += 1;
      progressByProject.set(r.project_id, prev);
    }

    // Calculate Commercial Stats
    const commMap = new Map<string, { count: number; revenue: number }>();
    for (const c of clientsAll) {
      const stats = commMap.get(c.owner_id) ?? { count: 0, revenue: 0 };
      stats.count += 1;
      if (c.subscription_type === "6-mois") stats.revenue += 5000;
      if (c.subscription_type === "12-mois") stats.revenue += 10000;
      commMap.set(c.owner_id, stats);
    }

    commercialStats = Array.from(commMap.entries())
      .map(([id, stats]) => ({
        name: userNameById.get(id) || "Inconnu",
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);

    const byTeam = teams.map((team) => ({
      team,
      users: usersCountByTeam.get(team) ?? 0,
      reports: reportsCountByTeam.get(team) ?? 0,
    }));

    const projectProgress = projectsAll.map((project) => {
      const data = progressByProject.get(project.id) ?? { total: 0, done: 0 };
      const progress = data.total ? Math.round((data.done / data.total) * 100) : 0;
      return { project: project.nom, progress };
    });

    adminAnalytics = { byTeam, byUser: [], projectProgress };
  }

  return (
    <div className="space-y-5">
      {debug ? (
        <Card className="border-dashed border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <h2 className="mb-2 text-base font-semibold">Debug Auth</h2>
          <div className="space-y-1 text-sm">
            <p>isDemoMode: {String(isDemoMode)}</p>
            <p>supabaseProjectRef: {supabaseProjectRef}</p>
            <p>anonKeySet: {String(anonKeySet)}</p>
            <p>serviceRoleKeySet: {String(serviceRoleKeySet)}</p>
            <p>userId: {user.id}</p>
            <p>userEmail: {(user as unknown as { email?: string }).email ?? "inconnu"}</p>
            <p>profileId: {profile?.id ?? "null"}</p>
            <p>profileRole: {profile?.role ?? "null"}</p>
            <p>profileEmail: {profile?.email ?? "null"}</p>
            <p>rlsProfile: {rlsProfileDebug.ok ? "ok" : "error"}</p>
            <p>rlsProfileId: {rlsProfileDebug.ok ? rlsProfileDebug.id ?? "null" : "n/a"}</p>
            <p>rlsProfileRole: {rlsProfileDebug.ok ? rlsProfileDebug.role ?? "null" : "n/a"}</p>
            <p>rlsProfileError: {rlsProfileDebug.ok ? "null" : rlsProfileDebug.error}</p>
            <p>adminProfile: {adminProfileDebug.ok ? "ok" : "error"}</p>
            <p>adminProfileId: {adminProfileDebug.ok ? adminProfileDebug.id ?? "null" : "n/a"}</p>
            <p>adminProfileRole: {adminProfileDebug.ok ? adminProfileDebug.role ?? "null" : "n/a"}</p>
            <p>adminProfileError: {adminProfileDebug.ok ? "null" : adminProfileDebug.error}</p>
            <p>vercelCommit: {vercelCommit ?? "n/a"}</p>
          </div>
        </Card>
      ) : null}
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
      {isAdmin && adminAnalytics ? (
        <AdminWidgets analytics={adminAnalytics} commercialStats={commercialStats} />
      ) : null}
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
