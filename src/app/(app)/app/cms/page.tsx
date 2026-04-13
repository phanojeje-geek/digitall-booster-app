import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { mockClients, mockContents } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import { upsertPageContentAction } from "@/features/cms/actions";

export default async function CmsPage() {
  const user = await getCurrentUser();
  let clients = mockClients.map((c) => ({ id: c.id, nom: c.nom }));
  let contents = mockContents;

  if (!isDemoMode) {
    const supabase = await createClient();
    const results = await Promise.all([
      supabase.from("clients").select("id,nom").eq("owner_id", user.id).order("nom"),
      supabase
        .from("pages_content")
        .select("id,client_id,section,contenu,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    clients = results[0].data ?? [];
    contents = results[1].data ?? [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CMS Basique</h1>
      <Card>
        <h2 className="mb-3 font-semibold">Edition de contenu</h2>
        <form action={upsertPageContentAction} className="grid gap-3 md:grid-cols-2">
          <select
            name="client_id"
            required
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Selectionner un client</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom}
              </option>
            ))}
          </select>
          <Input name="section" required placeholder="Section (hero, services...)" />
          <textarea
            name="contenu"
            required
            className="min-h-24 rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2"
            placeholder='{"title":"Titre","subtitle":"Description"}'
          />
          <Button type="submit">Sauvegarder</Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {(contents ?? []).map((content) => (
          <Card key={content.id}>
            <p className="text-sm font-semibold">{content.section}</p>
            <pre className="overflow-auto text-xs text-zinc-500">
              {JSON.stringify(content.contenu, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
