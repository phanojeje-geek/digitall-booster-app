import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { CommercialGroupsMap } from "@/components/commercial-groups-map";
import { getCurrentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bootstrapStorageBucketsAction,
  createUserAccountAction,
  createDefaultAdminAccountAction,
  deleteUserAction,
  resetUserAccessAction,
  sendAdminNotificationAction,
  toggleUserBlockAction,
  updateCommercialGroupAction,
  updateUserRoleAction,
} from "@/features/users/actions";
import type { Role } from "@/lib/types";
import { KeyRound, Lock, LockOpen } from "lucide-react";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; password?: string }>;
}) {
  const params = await searchParams;
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
        email: profile.email ?? null,
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
    const supabase = createAdminClient();
    
    try {
      const [{ data, error: profilesError }, { data: logs, error: logsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,full_name,email,role,sales_group,is_blocked,access_reset_at,connection_status,last_login_at,last_logout_at,last_latitude,last_longitude,last_geo_label,created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("connection_logs")
          .select("id,user_id,status,login_at,logout_at,geo_label,latitude,longitude")
          .order("login_at", { ascending: false })
          .limit(300),
      ]);
      
      if (profilesError) {
        console.error("Erreur lors de la récupération des profils:", profilesError);
      }
      if (logsError) {
        console.error("Erreur lors de la récupération des logs:", logsError);
      }
      
      users = (data ?? []) as UserRow[];
      const castLogs = (logs ?? []) as ConnectionLogRow[];
      logsByUser = castLogs.reduce<Record<string, ConnectionLogRow[]>>((acc, log) => {
        if (!acc[log.user_id]) acc[log.user_id] = [];
        if (acc[log.user_id].length < 5) acc[log.user_id].push(log);
        return acc;
      }, {});
    } catch (error) {
      console.error("Erreur critique lors du chargement des utilisateurs:", error);
      users = [];
      logsByUser = {};
    }
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

      {params.reset ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          Email de reinitialisation envoye.
        </p>
      ) : null}

      {params.password ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          Mot de passe mis a jour.
        </p>
      ) : null}

      {params.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {params.error === "reset"
            ? "Reset impossible. Verifiez les URLs de redirection Supabase puis reessayez."
            : params.error === "password"
              ? "Changement de mot de passe impossible. Reessayez."
              : "Operation impossible. Reessayez."}
        </p>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Creer un utilisateur</h2>
        <p className="text-sm text-zinc-500">
          Creation de comptes reservee aux admins. Mot de passe minimum 8 caracteres.
        </p>
        <ConfirmForm
          action={createUserAccountAction}
          confirmMessage="Confirmer la creation de ce compte ?"
          className="grid gap-3 md:grid-cols-2"
        >
          <input
            name="full_name"
            required
            placeholder="Nom complet"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Mot de passe"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          />
          <select
            name="role"
            defaultValue="commercial"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          >
            <option value="admin">admin</option>
            <option value="commercial">commercial</option>
            <option value="marketing">marketing / community manager</option>
            <option value="dev">dev</option>
            <option value="designer">designer</option>
          </select>
          <select
            name="sales_group"
            defaultValue="groupe-a"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          >
            <option value="groupe-a">groupe-a</option>
            <option value="groupe-b">groupe-b</option>
            <option value="groupe-c">groupe-c</option>
          </select>
          <div className="md:col-span-2">
            <Button type="submit" variant="secondary">
              Creer le compte
            </Button>
          </div>
        </ConfirmForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Storage</h2>
        <p className="text-sm text-zinc-500">
          Initialise les buckets requis pour les pieces (client-documents), fichiers (client-files) et captures (activity-reports).
        </p>
        <ConfirmForm action={bootstrapStorageBucketsAction} confirmMessage="Confirmer l initialisation des buckets Storage ?">
          <Button type="submit" variant="secondary">
            Initialiser Storage
          </Button>
        </ConfirmForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Bootstrap admin</h2>
        <p className="text-sm text-zinc-500">
          Cree (ou force) le compte admin par defaut: phanojeje@gmail.com.
        </p>
        <form action={createDefaultAdminAccountAction}>
          <Button type="submit" variant="secondary">
            Initialiser admin par defaut
          </Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Notification admin</h2>
        <form action={sendAdminNotificationAction} className="grid gap-3 md:grid-cols-2">
          <input
            name="title"
            placeholder="Titre (optionnel)"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          />
          <select
            name="scope"
            defaultValue="global"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          >
            <option value="global">Globale (tout le monde)</option>
            <option value="role">Par profil</option>
            <option value="user">Par utilisateur</option>
          </select>
          <select
            name="target_role"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          >
            <option value="">Profil cible (si scope=role)</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            name="target_user_id"
            className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85"
          >
            <option value="">Utilisateur cible (si scope=user)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email || u.id}
              </option>
            ))}
          </select>
          <textarea
            name="message"
            required
            placeholder="Message de notification"
            className="min-h-20 rounded-lg border border-zinc-200/80 bg-white/90 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/85 md:col-span-2"
          />
          <Button type="submit" variant="secondary">
            Envoyer notification
          </Button>
        </form>
      </Card>

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
                <td className="text-zinc-500">{user.email || user.id}</td>
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
                    <ConfirmForm
                      action={updateUserRoleAction}
                      confirmMessage="Confirmer la modification du role ?"
                      className="flex items-center gap-2"
                    >
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
                    </ConfirmForm>

                    {user.role !== "admin" ? (
                      <ConfirmForm
                        action={toggleUserBlockAction}
                        confirmMessage={user.is_blocked ? "Confirmer le deblocage de ce compte ?" : "Confirmer le blocage de ce compte ?"}
                      >
                        <input type="hidden" name="user_id" value={user.id} />
                        <input type="hidden" name="next" value={user.is_blocked ? "false" : "true"} />
                        <Button type="submit" variant={user.is_blocked ? "secondary" : "danger"} aria-label={user.is_blocked ? "Debloquer" : "Bloquer"}>
                          {user.is_blocked ? <LockOpen size={16} /> : <Lock size={16} />}
                        </Button>
                      </ConfirmForm>
                    ) : null}

                    <ConfirmForm
                      action={resetUserAccessAction}
                      confirmMessage="Confirmer l envoi de l email de reinitialisation du mot de passe ?"
                    >
                      <input type="hidden" name="user_id" value={user.id} />
                      <Button type="submit" variant="ghost" aria-label="Reset mot de passe">
                        <KeyRound size={16} />
                      </Button>
                    </ConfirmForm>

                    <ConfirmForm action={deleteUserAction} confirmMessage="Confirmer la suppression definitive de ce compte ?">
                      <input type="hidden" name="user_id" value={user.id} />
                      <Button type="submit" variant="danger">
                        Supprimer
                      </Button>
                    </ConfirmForm>
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
