import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { mockClients, mockMembers, mockProjects } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectAction,
  deleteProjectAction,
  markProjectDoneAction,
  takeProjectAction,
  updateProjectStatusAction,
} from "@/features/projects/actions";
import type { Role } from "@/lib/types";

const statuses = ["en attente", "en cours", "termine"] as const;

type MemberRow = { id: string; full_name: string | null; role: Role };

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const role: Role = profile?.role ?? "dev";
  const isAdmin = role === "admin";
  const canWork = role !== "admin" && role !== "commercial";
  let clients = mockClients.map((c) => ({ id: c.id, nom: c.nom }));
  let projects = mockProjects;
  let members: MemberRow[] = mockMembers.map((m) => ({ ...m, role: "dev" }));

  if (!isDemoMode) {
    const supabase = await createClient();
    const results = await Promise.all([
      supabase
        .from("projects")
        .select("id,nom,type,statut,assigned_to,client_id,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,role").order("full_name"),
      supabase.from("clients").select("id,nom").order("nom"),
    ]);
    projects = (results[0].data ?? []) as typeof mockProjects;
    members = (results[1].data ?? []) as MemberRow[];
    clients = results[2].data ?? [];
  }

  const visibleProjects = isAdmin
    ? projects
    : (projects ?? []).filter((p) => p.assigned_to === null || p.assigned_to === user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projets</h1>
        <p className="text-sm text-zinc-500">Visualisez les projets par statut avec un flux type Kanban.</p>
      </div>

      {isAdmin ? (
        <Card>
          <h2 className="mb-3 font-semibold">Creer un projet</h2>
          <ConfirmForm
            action={createProjectAction}
            confirmMessage="Confirmer la creation de ce projet ?"
            className="grid gap-3 md:grid-cols-3"
          >
            <Input name="nom" required placeholder="Nom du projet" />
            <Input name="type" defaultValue="site web" placeholder="Type (seo, ads...)" />
            <select
              name="client_id"
              required
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Sélectionner un client</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <select
              name="assigned_to"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Assigner plus tard</option>
              {(members ?? [])
                .filter((m) => m.role !== "admin" && m.role !== "commercial")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? m.id}
                  </option>
                ))}
            </select>
            <select
              name="statut"
              defaultValue="en attente"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button type="submit">Ajouter</Button>
          </ConfirmForm>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {statuses.map((status) => (
          <Card key={status} className="space-y-2">
            <h2 className="font-semibold capitalize">{status}</h2>
            {(visibleProjects ?? [])
              .filter((project) => project.statut === status)
              .map((project) => (
                <div key={project.id} className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
                  <p className="font-medium">{project.nom}</p>
                  <p className="text-xs text-zinc-500">{project.type}</p>
                  <div className="mt-2 flex gap-2">
                    {isAdmin ? (
                      <>
                        <ConfirmForm action={updateProjectStatusAction} confirmMessage="Confirmer le changement de statut ?">
                          <input type="hidden" name="id" value={project.id} />
                          <input
                            type="hidden"
                            name="statut"
                            value={status === "en attente" ? "en cours" : "termine"}
                          />
                          <Button type="submit" variant="ghost">
                            Avancer
                          </Button>
                        </ConfirmForm>
                        <ConfirmForm action={deleteProjectAction} confirmMessage="Confirmer la suppression de ce projet ?">
                          <input type="hidden" name="id" value={project.id} />
                          <Button type="submit" variant="danger">
                            Suppr.
                          </Button>
                        </ConfirmForm>
                      </>
                    ) : canWork && status === "en attente" && !project.assigned_to ? (
                      <ConfirmForm action={takeProjectAction} confirmMessage="Confirmer la prise en charge de ce projet ?">
                        <input type="hidden" name="id" value={project.id} />
                        <Button type="submit" variant="secondary">
                          Commencer
                        </Button>
                      </ConfirmForm>
                    ) : canWork && status === "en cours" && project.assigned_to === user.id ? (
                      <ConfirmForm action={markProjectDoneAction} confirmMessage="Confirmer que ce projet est termine ?">
                        <input type="hidden" name="id" value={project.id} />
                        <Button type="submit" variant="secondary">
                          Terminer
                        </Button>
                      </ConfirmForm>
                    ) : null}
                  </div>
                </div>
              ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
