import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { SignaturePad } from "@/components/signature-pad";
import { ClientRegistrationForm } from "@/components/client-registration-form";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import {
  createClientAction,
  deleteClientAction,
  deleteClientSubscriptionAction,
  updateClientAction,
  updateClientSubscriptionAction,
} from "@/features/clients/actions";

export const dynamic = "force-dynamic";

type ClientListRow = {
  id: string;
  nom: string;
  entreprise: string | null;
  telephone: string | null;
  email: string;
  statut: string;
  owner_id?: string;
  intake_data?: Record<string, unknown> | null;
  created_at: string;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isCommercial = profile?.role === "commercial";
  const isAdmin = profile?.role === "admin";
  const params = await searchParams;
  let clients: ClientListRow[] = mockClients.map((client) => ({
    id: client.id,
    nom: client.nom,
    entreprise: client.entreprise,
    telephone: client.telephone,
    email: client.email,
    statut: client.statut,
    created_at: client.created_at,
  }));

  if (isDemoMode) {
    if (params.q) {
      const q = params.q.toLowerCase();
      clients = clients.filter(
        (client) =>
          client.nom.toLowerCase().includes(q) ||
          (client.entreprise ?? "").toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q),
      );
    }
    if (params.statut) {
      clients = clients.filter((client) => client.statut === params.statut);
    }
  } else {
    const supabase = await createClient();

    let query = supabase
      .from("clients")
      .select("id,nom,entreprise,telephone,email,statut,created_at,owner_id,intake_data")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("owner_id", user.id);
    }

    if (params.q) {
      query = query.or(`nom.ilike.%${params.q}%,entreprise.ilike.%${params.q}%,email.ilike.%${params.q}%`);
    }
    if (params.statut) {
      query = query.eq("statut", params.statut);
    }

    const { data } = await query;
    clients = (data ?? []) as ClientListRow[];
  }

  const prospects = clients.filter((c) => c.statut === "prospect");
  const customers = clients.filter((c) => c.statut === "client");
  const orderedClients = [...customers, ...prospects];
  let ownerLabelById: Record<string, string> = {};

  if (isAdmin && !isDemoMode) {
    const ownerIds = Array.from(new Set((clients ?? []).map((c) => c.owner_id).filter(Boolean))) as string[];
    if (ownerIds.length) {
      const supabase = await createClient();
      const { data: owners } = await supabase.from("profiles").select("id,full_name,email").in("id", ownerIds);
      ownerLabelById = Object.fromEntries(
        (owners ?? []).map((o) => [o.id, o.full_name || o.email || o.id.slice(0, 8)]),
      );
    }
  }

  const nowMs = new Date().getTime();
  const subscriptions = orderedClients
    .filter((c) => c.statut === "client")
    .map((c) => {
      const intake = (c.intake_data ?? {}) as Record<string, unknown>;
      const sub = (intake.subscription ?? {}) as Record<string, unknown>;
      const plan = (sub.plan as string | undefined) ?? (intake.subscription_plan as string | undefined) ?? "";
      const startedAt = (sub.started_at as string | undefined) ?? (intake.validated_at as string | undefined) ?? null;
      const endsAt = (sub.ends_at as string | undefined) ?? null;
      const endsMs = endsAt ? new Date(endsAt).getTime() : null;
      const daysLeft =
        endsMs && Number.isFinite(endsMs) ? Math.max(0, Math.ceil((endsMs - nowMs) / (24 * 60 * 60 * 1000))) : null;
      return {
        id: c.id,
        client: c.nom,
        entreprise: c.entreprise,
        owner_id: c.owner_id ?? null,
        plan,
        startedAt,
        endsAt,
        daysLeft,
      };
    });

  const expirationsByDate: Record<string, typeof subscriptions> = {};
  for (const s of subscriptions) {
    if (!s.endsAt) continue;
    const d = new Date(s.endsAt);
    if (!Number.isFinite(d.getTime())) continue;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    expirationsByDate[key] = [...(expirationsByDate[key] ?? []), s];
  }

  const month = new Date();
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const dayCount = monthEnd.getDate();
  const calendarCells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < startOffset; i += 1) {
    calendarCells.push({ date: null, key: `empty-${i}` });
  }
  for (let day = 1; day <= dayCount; day += 1) {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    calendarCells.push({ date: d, key: d.toISOString() });
  }
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({ date: null, key: `tail-${calendarCells.length}` });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CRM Clients</h1>
        <p className="text-sm text-zinc-500">Pilotez prospects et clients dans une vue unifiee.</p>
      </div>
      {isCommercial ? (
        <Card className="overflow-hidden border-indigo-100 shadow-xl shadow-indigo-500/5 dark:border-indigo-900/20">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white">Enregistrement client</h2>
            <p className="text-xs text-indigo-100/80">Remplissez tous les champs pour créer un dossier complet.</p>
          </div>
          <div className="p-6">
            <ClientRegistrationForm />
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-3 font-semibold">Enregistrement client</h2>
          <p className="text-sm text-zinc-500">
            Seuls les commerciaux peuvent enregistrer de nouveaux clients. Les admins consultent les dossiers et les preuves.
          </p>
        </Card>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-3">
          <Input name="q" defaultValue={params.q} placeholder="Rechercher..." />
          {isAdmin ? (
            <select
              name="statut"
              defaultValue={params.statut ?? ""}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Tous statuts</option>
              <option value="client">client</option>
              <option value="prospect">prospect</option>
            </select>
          ) : (
            <input type="hidden" name="statut" value="client" />
          )}
          <Button type="submit" variant="ghost">
            Filtrer
          </Button>
        </form>
      </Card>

      <Card className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-zinc-500">Total</p>
          <p className="text-2xl font-semibold tracking-tight">{clients.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Clients</p>
          <p className="text-2xl font-semibold tracking-tight">{customers.length}</p>
        </div>
        {isAdmin ? (
          <div>
            <p className="text-xs uppercase text-zinc-500">Prospects</p>
            <p className="text-2xl font-semibold tracking-tight">{prospects.length}</p>
          </div>
        ) : null}
      </Card>

      {isAdmin ? (
        <Card className="overflow-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Abonnements (clients validés)</h2>
          </div>
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2">Client</th>
                <th>Entreprise</th>
                <th>Commercial</th>
                <th>Formule</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Jours restants</th>
                <th className="w-52">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-zinc-200/80 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                >
                  <td className="py-2 font-medium">{s.client}</td>
                  <td>{s.entreprise ?? "-"}</td>
                  <td className="text-xs text-zinc-500">{s.owner_id ? ownerLabelById[s.owner_id] ?? s.owner_id.slice(0, 8) : "-"}</td>
                  <td className="text-xs">{s.plan ? s.plan.replaceAll("_", " ") : "-"}</td>
                  <td className="text-xs text-zinc-500">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString("fr-FR") : "-"}
                  </td>
                  <td className="text-xs text-zinc-500">{s.endsAt ? new Date(s.endsAt).toLocaleString("fr-FR") : "-"}</td>
                  <td className="text-xs font-semibold">
                    {s.daysLeft === null ? "-" : s.daysLeft === 0 ? "Expiré" : `J-${s.daysLeft}`}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <ConfirmForm
                        action={updateClientSubscriptionAction}
                        confirmMessage="Confirmer le passage à 6 mois ?"
                        className="inline-flex"
                      >
                        <input type="hidden" name="client_id" value={s.id} />
                        <input type="hidden" name="plan" value="6_mois_3000_fcfa" />
                        <Button type="submit" variant="ghost">
                          6 mois
                        </Button>
                      </ConfirmForm>
                      <ConfirmForm
                        action={updateClientSubscriptionAction}
                        confirmMessage="Confirmer le passage à 12 mois ?"
                        className="inline-flex"
                      >
                        <input type="hidden" name="client_id" value={s.id} />
                        <input type="hidden" name="plan" value="12_mois_5000_fcfa" />
                        <Button type="submit" variant="ghost">
                          12 mois
                        </Button>
                      </ConfirmForm>
                      <ConfirmForm
                        action={deleteClientSubscriptionAction}
                        confirmMessage="Confirmer la suppression de l'abonnement de ce client ?"
                        className="inline-flex"
                      >
                        <input type="hidden" name="client_id" value={s.id} />
                        <Button type="submit" variant="danger">
                          Suppr.
                        </Button>
                      </ConfirmForm>
                    </div>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 ? (
                <tr>
                  <td className="py-3 text-sm text-zinc-500" colSpan={8}>
                    Aucun abonnement actif pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Calendrier des échéances (ce mois)</h2>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-zinc-500">Les jours avec échéance affichent le nombre de clients.</p>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center font-semibold text-zinc-500">
                {d}
              </div>
            ))}
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="h-16 rounded-xl bg-zinc-50" />;
              }
              const yyyy = cell.date.getFullYear();
              const mm = String(cell.date.getMonth() + 1).padStart(2, "0");
              const dd = String(cell.date.getDate()).padStart(2, "0");
              const key = `${yyyy}-${mm}-${dd}`;
              const list = expirationsByDate[key] ?? [];
              return (
                <div
                  key={cell.key}
                  className={`h-16 rounded-xl border p-2 ${
                    list.length ? "border-indigo-200 bg-indigo-50" : "border-zinc-200/70 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{cell.date.getDate()}</span>
                    {list.length ? (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {list.length}
                      </span>
                    ) : null}
                  </div>
                  {list.length ? (
                    <p className="mt-1 truncate text-[11px] text-indigo-900">
                      {list.slice(0, 1).map((x: (typeof subscriptions)[number]) => x.client).join(", ")}
                      {list.length > 1 ? "…" : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-zinc-400">-</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 md:hidden">
        {[
          { key: "client", label: "Clients", rows: customers },
          ...(isAdmin ? [{ key: "prospect", label: "Prospects", rows: prospects }] : []),
        ].map((section) => {
          if (!section.rows.length) return null;
          return (
            <details key={section.key} className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3" open>
              <summary className="cursor-pointer select-none text-sm font-semibold">
                {section.label} — {section.rows.length}
              </summary>
              <div className="mt-3 grid gap-3">
                {section.rows.map((client) => (
                  <Card key={client.id}>
                    <p className="font-medium">{client.nom}</p>
                    <p className="text-sm text-zinc-500">{client.entreprise ?? "-"}</p>
                    <p className="text-sm">{client.email}</p>
                    <p className="mb-2 text-xs uppercase text-zinc-500">{client.statut}</p>
                    <Link href={`/app/clients/${client.id}`} className="mt-2 inline-flex w-full">
                      <Button type="button" variant="ghost" className="w-full">
                        Dossier client
                      </Button>
                    </Link>
                    {isAdmin && client.statut === "prospect" ? (
                      <ConfirmForm
                        action={updateClientAction}
                        confirmMessage="Confirmer le passage au statut client ?"
                        className="mt-2"
                      >
                        <input type="hidden" name="id" value={client.id} />
                        <input type="hidden" name="nom" value={client.nom} />
                        <input type="hidden" name="entreprise" value={client.entreprise ?? ""} />
                        <input type="hidden" name="telephone" value={client.telephone ?? ""} />
                        <input type="hidden" name="email" value={client.email} />
                        <input type="hidden" name="statut" value="client" />
                        <Button type="submit" variant="secondary" className="w-full">
                          Passer en client
                        </Button>
                      </ConfirmForm>
                    ) : null}
                    {isAdmin ? (
                      <ConfirmForm
                        action={deleteClientAction}
                        confirmMessage="Confirmer la suppression de ce client ?"
                        className="mt-2"
                      >
                        <input type="hidden" name="id" value={client.id} />
                        <Button type="submit" variant="danger" className="w-full">
                          Supprimer
                        </Button>
                      </ConfirmForm>
                    ) : null}
                  </Card>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <Card className="hidden overflow-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-2">Nom</th>
              <th>Entreprise</th>
              <th>Email</th>
              <th>Statut</th>
              {isAdmin ? <th>Commercial</th> : null}
              <th className="w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedClients.map((client) => (
              <tr
                key={client.id}
                className="border-t border-zinc-200/80 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
              >
                <td className="py-2">{client.nom}</td>
                <td>{client.entreprise}</td>
                <td>{client.email}</td>
                <td>{client.statut}</td>
                {isAdmin ? <td className="text-xs text-zinc-500">{client.owner_id?.slice(0, 8) ?? "-"}</td> : null}
                <td>
                  <div className="flex gap-2">
                    <Link href={`/app/clients/${client.id}`}>
                      <Button type="button" variant="ghost">
                        Dossier
                      </Button>
                    </Link>
                    {isAdmin && client.statut === "prospect" ? (
                      <ConfirmForm action={updateClientAction} confirmMessage="Confirmer le passage au statut client ?">
                        <input type="hidden" name="id" value={client.id} />
                        <input type="hidden" name="nom" value={client.nom} />
                        <input type="hidden" name="entreprise" value={client.entreprise ?? ""} />
                        <input type="hidden" name="telephone" value={client.telephone ?? ""} />
                        <input type="hidden" name="email" value={client.email} />
                        <input type="hidden" name="statut" value="client" />
                        <Button type="submit" variant="ghost">
                          Passer en client
                        </Button>
                      </ConfirmForm>
                    ) : null}
                    {isAdmin ? (
                      <ConfirmForm action={deleteClientAction} confirmMessage="Confirmer la suppression de ce client ?">
                        <input type="hidden" name="id" value={client.id} />
                        <Button type="submit" variant="danger">
                          Supprimer
                        </Button>
                      </ConfirmForm>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
