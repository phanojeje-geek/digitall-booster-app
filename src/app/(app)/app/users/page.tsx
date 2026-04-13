import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommercialGroupsMap } from "@/components/commercial-groups-map";
import { getCurrentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import {
  resetUserAccessAction,
  toggleUserBlockAction,
  updateCommercialGroupAction,
  updateUserRoleAction,
} from "@/features/users/actions";
import type { Role } from "@/lib/types";

type UserRow = {
  id: string;
  full_name: string | null;
  role: Role;
  sales_group?: "groupe-a" | "groupe-b" | "groupe-c";
  is_blocked?: boolean;
  access_reset_at?: string | null;
  connection_status?: "online" | "offline";
  last_login_at?: string | null;
  last_logout_at?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_geo_label?: string | null;
  created_at: string;
};

type ConnectionLogRow = {
  id: string;
  user_id: string;
  status: "online" | "offline";
  login_at: string;
  logout_at: string | null;
  geo_label: string | null;
  latitude: number | null;
  longitude: number | null;
};

const roles: Role[] = ["admin", "commercial", "marketing", "dev", "designer"];

export default async function UsersPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    redirect("/app?forbidden=1");
  }

  let users: UserRow[] = [];
  let logsByUser: Record<string, ConnectionLogRow[]> = {};

  if (isDemoMode) {
    users = [
      {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        sales_group: "groupe-a",
        is_blocked: false,
        access_reset_at: null,
        connection_status: "online",
        last_login_at: null,
        last_logout_at: null,
        last_latitude: null,
        last_longitude: null,
        last_geo_label: null,
        created_at: profile.created_at,
      },
    ];
  } else {
    const supabase = await createClient();
    const [{ data }, { data: logs }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,role,sales_group,is_blocked,access_reset_at,connection_status,last_login_at,last_logout_at,last_latitude,last_longitude,last_geo_label,created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("connection_logs")
        .select("id,user_id,status,login_at,logout_at,geo_label,latitude,longitude")
        .order("login_at", { ascending: false })
        .limit(300),
    ]);
    users = (data ?? []) as UserRow[];
    const castLogs = (logs ?? []) as ConnectionLogRow[];
    logsByUser = castLogs.reduce<Record<string, ConnectionLogRow[]>>((acc, log) => {
      if (!acc[log.user_id]) acc[log.user_id] = [];
      if (acc[log.user_id].length < 5) acc[log.user_id].push(log);
      return acc;
    }, {});
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-zinc-500">Gestion des profils et des roles de la plateforme.</p>
        {isDemoMode ? (
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
            Mode demo: le changement applique le role au profil local courant.
          </p>
        ) : null}
      </div>

      <Card className="overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2">Nom</th>
              <th>Email / ID</th>
              <th>Role</th>
              <th>Groupe</th>
              <th>Statut</th>
              <th>Connexion</th>
              <th className="w-72">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-zinc-200/80 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
              >
                <td className="py-2 font-medium">{user.full_name || "Sans nom"}</td>
                <td className="text-zinc-500">{user.id}</td>
                <td className="uppercase">{user.role}</td>
                <td className="align-top">
                  {user.role === "commercial" ? (
                    <form action={updateCommercialGroupAction} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={user.id} />
                      <select
                        name="sales_group"
                        defaultValue={user.sales_group ?? "groupe-a"}
                        className="h-9 rounded-lg border border-zinc-200/80 bg-white/90 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
                      >
                        <option value="groupe-a">groupe-a</option>
                        <option value="groupe-b">groupe-b</option>
                        <option value="groupe-c">groupe-c</option>
                      </select>
                      <Button type="submit" variant="ghost">
                        Sauver
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-zinc-500">-</span>
                  )}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      user.is_blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {user.is_blocked ? "bloque" : "actif"}
                  </span>
                </td>
                <td className="align-top">
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">
                      {user.connection_status === "online" ? "En ligne" : "Hors ligne"}
                    </p>
                    {user.last_login_at ? (
                      <p className="text-zinc-500">Derniere connexion: {new Date(user.last_login_at).toLocaleString("fr-FR")}</p>
                    ) : null}
                    {user.role === "commercial" ? (
                      <p className="text-zinc-500">
                        Position: {user.last_geo_label || "indisponible"}
                        {user.last_latitude && user.last_longitude
                          ? ` (${user.last_latitude}, ${user.last_longitude})`
                          : ""}
                      </p>
                    ) : null}
                    <div className="rounded-md bg-zinc-100 p-2 dark:bg-zinc-800/80">
                      <p className="mb-1 font-medium">Historique</p>
                      <div className="space-y-1">
                        {(logsByUser[user.id] ?? []).map((log) => (
                          <p key={log.id} className="text-zinc-600 dark:text-zinc-300">
                            {new Date(log.login_at).toLocaleString("fr-FR")} - {log.status}
                            {user.role === "commercial" && (log.geo_label || log.latitude || log.longitude) ? (
                              <> - {log.geo_label || `${log.latitude}, ${log.longitude}`}</>
                            ) : null}
                          </p>
                        ))}
                        {(logsByUser[user.id] ?? []).length === 0 ? (
                          <p className="text-zinc-500">Aucune entree</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={updateUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="h-9 rounded-lg border border-zinc-200/80 bg-white/90 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="ghost">
                        Sauver
                      </Button>
                    </form>
                    <form action={toggleUserBlockAction}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <input type="hidden" name="next" value={user.is_blocked ? "false" : "true"} />
                      <Button type="submit" variant={user.is_blocked ? "secondary" : "danger"}>
                        {user.is_blocked ? "Debloquer" : "Bloquer"}
                      </Button>
                    </form>
                    <form action={resetUserAccessAction}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <Button type="submit" variant="ghost">
                        Reset acces
                      </Button>
                    </form>
                  </div>
                  {user.access_reset_at ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Dernier reset: {new Date(user.access_reset_at).toLocaleString("fr-FR")}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Carte temps reel commerciaux</h2>
        <p className="text-sm text-zinc-500">
          Le boss peut suivre les commerciaux actifs, regroupes par equipe (A/B/C), avec mise a jour en continu.
        </p>
        {isDemoMode ? (
          <p className="text-sm text-zinc-500">Disponible en mode connecte Supabase.</p>
        ) : (
          <CommercialGroupsMap />
        )}
      </Card>
    </div>
  );
}
