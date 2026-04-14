import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ClientDocumentsUploader } from "@/components/uploaders";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import { saveClientSignatureAction } from "@/features/clients/actions";
import { SignaturePad } from "@/components/signature-pad";

type Params = Promise<{ id: string }>;

export default async function ClientOnboardingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ upload_error?: string }>;
}) {
  const { id } = await params;
  const qp = await searchParams;
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const canEdit = profile?.role === "commercial" || profile?.role === "admin";

  let clientData: { id: string; nom: string; entreprise: string | null; telephone: string | null } | null = null;
  let documents: Array<{
    id: string;
    doc_type: string;
    file_name: string;
    storage_path: string;
    created_at: string;
    signed_url?: string | null;
  }> = [];
  let signatures: Array<{ id: string; signature_data_url: string; created_at: string }> = [];

  if (!isDemoMode) {
    const supabase = await createClient();
    const query = supabase
      .from("clients")
      .select("id,nom,entreprise,telephone,owner_id")
      .eq("id", id)
      .single();
    const { data: rawClient } = await query;
    if (!rawClient) return notFound();
    if (profile?.role !== "admin" && rawClient.owner_id !== user.id) return notFound();

    clientData = {
      id: rawClient.id,
      nom: rawClient.nom,
      entreprise: rawClient.entreprise,
      telephone: rawClient.telephone,
    };

    const [{ data: docs }, { data: signs }] = await Promise.all([
      supabase
        .from("client_documents")
        .select("id,doc_type,file_name,storage_path,created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_signatures")
        .select("id,signature_data_url,created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);
    const rawDocs = docs ?? [];
    const signed = await Promise.all(
      rawDocs.map(async (doc) => {
        const { data } = await supabase!.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60);
        return { ...doc, signed_url: data?.signedUrl ?? null };
      }),
    );
    documents = signed;
    signatures = signs ?? [];
  } else {
    clientData = { id, nom: "Client Demo", entreprise: "Entreprise Demo", telephone: "0600000000" };
  }

  return (
    <div className="space-y-5">
      {qp.upload_error ? (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Erreur upload: {qp.upload_error}
        </Card>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dossier client</h1>
          <p className="text-sm text-zinc-500">
            {clientData?.nom} {clientData?.entreprise ? `- ${clientData.entreprise}` : ""}
          </p>
        </div>
        <Link href="/app/clients">
          <Button type="button" variant="ghost">
            Retour CRM
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Documents d identite</h2>
          {canEdit ? (
            <ClientDocumentsUploader clientId={id} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.length === 0 ? <p className="text-sm text-zinc-500">Aucun document.</p> : null}
            {documents.map((doc) => {
              const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
              return (
                <div key={doc.id} className="space-y-2 rounded-xl bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
                  {isImage && doc.signed_url ? (
                    <Image
                      src={doc.signed_url}
                      alt={doc.file_name}
                      width={520}
                      height={320}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-white/60 text-xs text-zinc-500 dark:bg-zinc-900/60">
                      Apercu indisponible
                    </div>
                  )}
                  <p className="truncate font-medium">{doc.doc_type.replaceAll("_", " ").toUpperCase()}</p>
                  <p className="truncate text-xs text-zinc-500">{doc.file_name}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Signature client</h2>
          {canEdit ? (
            <form action={saveClientSignatureAction} className="mb-4 space-y-3">
              <input type="hidden" name="client_id" value={id} />
              <SignaturePad />
              <Button type="submit">Enregistrer la signature</Button>
            </form>
          ) : null}
          <div className="space-y-2">
            {signatures.length === 0 ? <p className="text-sm text-zinc-500">Aucune signature.</p> : null}
            {signatures.slice(0, 3).map((sig) => (
              <div key={sig.id} className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sig.signature_data_url} alt="Signature client" className="h-20 w-full object-contain" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
