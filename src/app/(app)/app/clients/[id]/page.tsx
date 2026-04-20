import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientDocumentsUploader } from "@/components/uploaders";
import { ImageViewer } from "@/components/image-viewer";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { saveClientSignatureAction } from "@/features/clients/actions";
import { SignaturePad } from "@/components/signature-pad";

type Params = Promise<{ id: string }>;

type IntakeData = {
  company?: {
    name?: string;
    sector?: string;
    legal_form?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    name?: string;
    position?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  digital_presence?: {
    facebook?: string;
    instagram?: string;
    website?: string;
    other_platforms?: string;
  };
  objectives?: string[];
  subscription_plan?: string;
  objectives_other?: string;
  activity_description?: string;
  responsible_name?: string;
  signed_at?: string;
};

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
  const canEdit = profile?.role === "commercial";
  const canDownloadPdf = profile?.role === "admin";

  let clientData: { id: string; nom: string; entreprise: string | null; telephone: string | null } | null = null;
  let intake: IntakeData | null = null;
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
      .select("id,nom,entreprise,telephone,owner_id,intake_data")
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
    intake = (rawClient as unknown as { intake_data?: IntakeData | null }).intake_data ?? null;

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
    const rawDocs = (docs ?? []) as Array<{
      id: string;
      doc_type: string;
      file_name: string;
      storage_path: string;
      created_at: string;
    }>;

    if (profile?.role === "admin") {
      const admin = createAdminClient();
      const signed = await Promise.all(
        rawDocs.map(async (doc) => {
          const { data } = await admin.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60);
          return { ...doc, signed_url: data?.signedUrl ?? null };
        }),
      );
      documents = signed;
    } else {
      documents = rawDocs;
    }
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
function Value({ v }: { v: any }) {
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
    return <span className="text-zinc-400 italic font-normal">Néant</span>;
  }
  if (typeof v === "boolean") return <span className="font-medium text-zinc-900 dark:text-zinc-100">{v ? "Oui" : "Non"}</span>;
  return <span className="font-medium text-zinc-900 dark:text-zinc-100">{String(v)}</span>;
}

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
  const canEdit = profile?.role === "commercial";
  const canDownloadPdf = profile?.role === "admin";

  let clientData: { id: string; nom: string; entreprise: string | null; telephone: string | null } | null = null;
  let intake: IntakeData | null = null;
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
      .select("id,nom,entreprise,telephone,owner_id,intake_data")
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
    intake = (rawClient as unknown as { intake_data?: IntakeData | null }).intake_data ?? null;

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
    const rawDocs = (docs ?? []) as Array<{
      id: string;
      doc_type: string;
      file_name: string;
      storage_path: string;
      created_at: string;
    }>;

    if (profile?.role === "admin") {
      const admin = createAdminClient();
      const signed = await Promise.all(
        rawDocs.map(async (doc) => {
          const { data } = await admin.storage.from("client-documents").createSignedUrl(doc.storage_path, 60 * 60);
          return { ...doc, signed_url: data?.signedUrl ?? null };
        }),
      );
      documents = signed;
    } else {
      documents = rawDocs;
    }
    signatures = signs ?? [];
  } else {
    clientData = { id, nom: "Client Demo", entreprise: "Entreprise Demo", telephone: "0600000000" };
  }

  return (
    <div className="space-y-6 pb-20">
      {qp.upload_error ? (
        <Card className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Erreur upload: {qp.upload_error}
        </Card>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dossier client</h1>
          <p className="text-sm text-zinc-500">
            {clientData?.nom} {clientData?.entreprise ? `- ${clientData.entreprise}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDownloadPdf ? (
            <Link href={`/api/clients/${id}/signature`}>
              <Button type="button" variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                Télécharger Fiche PDF
              </Button>
            </Link>
          ) : null}
          <Link href="/app/clients">
            <Button type="button" variant="ghost">
              Retour CRM
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        {intake ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Informations sur l'entreprise</h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Nom de l'entreprise</p>
                  <p><Value v={intake.company?.name || clientData?.entreprise} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Secteur d'activité</p>
                  <p><Value v={intake.company?.sector} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Forme juridique</p>
                  <p><Value v={intake.company?.legal_form} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Adresse</p>
                  <p><Value v={intake.company?.address} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Ville</p>
                  <p><Value v={intake.company?.city} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Pays</p>
                  <p><Value v={intake.company?.country} /></p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Contact principal</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Nom & Prénoms</p>
                  <p><Value v={intake.contact?.name || clientData?.nom} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Fonction</p>
                  <p><Value v={intake.contact?.position} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Téléphone</p>
                  <p><Value v={intake.contact?.phone || clientData?.telephone} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">WhatsApp</p>
                  <p><Value v={intake.contact?.whatsapp} /></p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Email</p>
                  <p><Value v={intake.contact?.email} /></p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Présence digitale</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Facebook</p>
                  <p><Value v={intake.digital_presence?.facebook} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Instagram</p>
                  <p><Value v={intake.digital_presence?.instagram} /></p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Site Web</p>
                  <p><Value v={intake.digital_presence?.website} /></p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Autres plateformes</p>
                  <p><Value v={intake.digital_presence?.other_platforms} /></p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Objectifs & Abonnement</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Objectifs de l'entreprise</p>
                  <p><Value v={Array.isArray(intake.objectives) && intake.objectives.length ? intake.objectives.join(", ") : null} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Autres objectifs</p>
                  <p><Value v={intake.objectives_other} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-bold text-zinc-500">Choix de l'abonnement</p>
                  <p><Value v={intake.subscription_plan?.replaceAll("_", " ")} /></p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Description de l'activité</h2>
              <div className="space-y-1">
                <p className="text-sm whitespace-pre-wrap"><Value v={intake.activity_description} /></p>
              </div>
            </Card>
          </div>
        ) : (
          <Card>
            <p className="text-zinc-500">Aucune fiche d'inscription détaillée disponible.</p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Documents d'identité</h2>
            {canEdit ? (
              <div className="mb-6">
                <ClientDocumentsUploader clientId={id} />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.length === 0 ? <p className="text-sm text-zinc-500">Aucun document téléversé.</p> : null}
              {documents.map((doc) => {
                const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.file_name);
                return (
                  <div key={doc.id} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-white dark:bg-zinc-950">
                      {isImage ? (
                        doc.signed_url ? (
                          <ImageViewer
                            src={doc.signed_url}
                            alt={doc.file_name}
                            width={900}
                            height={600}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ImageViewer
                            bucket="client-documents"
                            path={doc.storage_path}
                            alt={doc.file_name}
                            width={900}
                            height={600}
                            className="h-full w-full object-contain"
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                          Aperçu indisponible
                        </div>
                      )}
                    </div>
                    <p className="truncate text-xs font-bold uppercase text-zinc-700 dark:text-zinc-300">{doc.doc_type.replaceAll("_", " ")}</p>
                    <p className="truncate text-[10px] text-zinc-500">{doc.file_name}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold border-b border-zinc-100 pb-2 dark:border-zinc-800">Signature client</h2>
            {canEdit ? (
              <form action={saveClientSignatureAction} className="mb-6 space-y-4">
                <input type="hidden" name="client_id" value={id} />
                <SignaturePad />
                <Button type="submit" className="w-full">Enregistrer la signature</Button>
              </form>
            ) : null}
            <div className="space-y-4">
              {signatures.length === 0 ? <p className="text-sm text-zinc-500">Aucune signature enregistrée.</p> : null}
              {signatures.slice(0, 1).map((sig) => (
                <div key={sig.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="aspect-[3/1] w-full">
                    {sig.signature_data_url === "CONSENT_CHECKED" ? (
                      <div className="flex h-full items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                        <p className="text-sm font-bold">✓ Accord écrit donné par le client</p>
                      </div>
                    ) : (
                      <ImageViewer
                        src={sig.signature_data_url}
                        alt="Signature client"
                        width={900}
                        height={300}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-500">
                    Enregistrée le {new Date(sig.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
