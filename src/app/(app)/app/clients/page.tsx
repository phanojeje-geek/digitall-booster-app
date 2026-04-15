import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import { createClientAction, deleteClientAction, updateClientAction } from "@/features/clients/actions";

type ClientListRow = {
  id: string;
  nom: string;
  entreprise: string | null;
  telephone: string | null;
  email: string;
  statut: string;
  owner_id?: string;
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
      .select("id,nom,entreprise,telephone,email,statut,created_at,owner_id")
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
  const enCours = clients.filter((c) => c.statut === "en cours");
  const customers = clients.filter((c) => c.statut === "client");
  const other = clients.filter((c) => !["prospect", "en cours", "client"].includes(c.statut));
  const orderedClients = [...prospects, ...enCours, ...customers, ...other];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CRM Clients</h1>
        <p className="text-sm text-zinc-500">Pilotez prospects et clients dans une vue unifiee.</p>
      </div>
      {isCommercial ? (
        <Card>
          <h2 className="mb-3 font-semibold">Fiche d inscription premium</h2>
          <ConfirmForm
            action={createClientAction}
            confirmMessage="Confirmer l ajout de ce client ?"
            className="grid gap-3 md:grid-cols-3"
          >
            <input type="hidden" name="statut" value="prospect" />
            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Informations sur l entreprise</p>
            </div>
            <Input name="entreprise" placeholder="Nom de l entreprise" />
            <Input name="company_sector" placeholder="Secteur d activite" />
            <Input name="company_legal_form" placeholder="Forme juridique" />
            <Input name="company_address" placeholder="Adresse" />
            <Input name="company_city" placeholder="Ville" />
            <Input name="company_country" placeholder="Pays" />
            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Contact principal</p>
            </div>
            <Input name="nom" required placeholder="Nom & Prenoms" />
            <Input name="contact_position" placeholder="Fonction" />
            <Input name="telephone" placeholder="Telephone" />
            <Input name="contact_whatsapp" placeholder="WhatsApp" />
            <Input name="email" type="email" required placeholder="Email" />
            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Presence digitale</p>
            </div>
            <Input name="facebook" placeholder="Page Facebook" />
            <Input name="instagram" placeholder="Compte Instagram" />
            <Input name="website" placeholder="Site Web" />
            <Input name="other_platforms" placeholder="Autres plateformes" className="md:col-span-3" />

            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Objectifs de l entreprise</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="objectives" value="Augmenter la visibilite" />
                  Augmenter la visibilite
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="objectives" value="Attirer plus de clients" />
                  Attirer plus de clients
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="objectives" value="Ameliorer l image de marque" />
                  Ameliorer l image de marque
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="objectives" value="Booster les ventes" />
                  Booster les ventes
                </label>
              </div>
              <input
                name="objectives_other"
                placeholder="Autres..."
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Choix de l abonnement</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="subscription_plan" value="6_mois_3000_fcfa" required />
                  Formule 6 mois - 3000 FCFA
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="subscription_plan" value="12_mois_5000_fcfa" required />
                  Formule 12 mois - 5000 FCFA
                </label>
              </div>
            </div>

            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Description de votre activite</p>
              <textarea
                name="activity_description"
                rows={4}
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <div className="md:col-span-3">
              <p className="text-sm font-semibold">Validation</p>
            </div>
            <Input name="responsible_name" placeholder="Nom du responsable" />
            <Input name="signed_at" placeholder="Date (ex: 2026-04-15)" />

            <div className="md:col-span-3">
              <Button type="submit">Enregistrer (Prospect)</Button>
            </div>
          </ConfirmForm>
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
          <select
            name="statut"
            defaultValue={params.statut ?? ""}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Tous statuts</option>
            <option value="prospect">prospect</option>
            <option value="en cours">en cours</option>
            <option value="client">client</option>
          </select>
          <Button type="submit" variant="ghost">
            Filtrer
          </Button>
        </form>
      </Card>

      <Card className="grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-zinc-500">Total</p>
          <p className="text-2xl font-semibold tracking-tight">{clients.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Prospects</p>
          <p className="text-2xl font-semibold tracking-tight">{prospects.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">En cours</p>
          <p className="text-2xl font-semibold tracking-tight">{enCours.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Clients</p>
          <p className="text-2xl font-semibold tracking-tight">{customers.length}</p>
        </div>
      </Card>

      <div className="grid gap-3 md:hidden">
        {[
          { key: "prospect", label: "Prospects", rows: prospects },
          { key: "en cours", label: "En cours", rows: enCours },
          { key: "client", label: "Clients", rows: customers },
          { key: "autres", label: "Autres", rows: other },
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
                    <ConfirmForm
                      action={updateClientAction}
                      confirmMessage="Confirmer le passage au statut suivant ?"
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={client.id} />
                      <input type="hidden" name="nom" value={client.nom} />
                      <input type="hidden" name="entreprise" value={client.entreprise ?? ""} />
                      <input type="hidden" name="telephone" value={client.telephone ?? ""} />
                      <input type="hidden" name="email" value={client.email} />
                      <input type="hidden" name="statut" value={client.statut === "prospect" ? "en cours" : "client"} />
                      <Button type="submit" variant="secondary" className="w-full">
                        Avancer
                      </Button>
                    </ConfirmForm>
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
                    <ConfirmForm
                      action={updateClientAction}
                      confirmMessage="Confirmer le passage au statut suivant ?"
                      className="flex gap-2"
                    >
                      <input type="hidden" name="id" value={client.id} />
                      <input type="hidden" name="nom" value={client.nom} />
                      <input type="hidden" name="entreprise" value={client.entreprise ?? ""} />
                      <input type="hidden" name="telephone" value={client.telephone ?? ""} />
                      <input type="hidden" name="email" value={client.email} />
                      <input
                        type="hidden"
                        name="statut"
                        value={client.statut === "prospect" ? "en cours" : "client"}
                      />
                      <Button type="submit" variant="ghost">
                        Avancer
                      </Button>
                    </ConfirmForm>
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
