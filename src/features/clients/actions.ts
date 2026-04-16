"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function planToMonths(plan: string) {
  const p = plan.toLowerCase();
  if (p.includes("12") || p.includes("12_mois")) return 12;
  if (p.includes("6") || p.includes("6_mois")) return 6;
  return 0;
}

export async function createClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "commercial") {
    return;
  }
  const supabase = await createClient();

  const objectives = formData.getAll("objectives").map((v) => String(v)).filter(Boolean);
  const subscriptionPlan = String(formData.get("subscription_plan") ?? "");
  const intakeData =
    profile?.role === "commercial"
      ? {
          company: {
            name: String(formData.get("entreprise") ?? ""),
            sector: String(formData.get("company_sector") ?? ""),
            legal_form: String(formData.get("company_legal_form") ?? ""),
            address: String(formData.get("company_address") ?? ""),
            city: String(formData.get("company_city") ?? ""),
            country: String(formData.get("company_country") ?? ""),
          },
          contact: {
            name: String(formData.get("nom") ?? ""),
            position: String(formData.get("contact_position") ?? ""),
            phone: String(formData.get("telephone") ?? ""),
            whatsapp: String(formData.get("contact_whatsapp") ?? ""),
            email: String(formData.get("email") ?? ""),
          },
          digital_presence: {
            facebook: String(formData.get("facebook") ?? ""),
            instagram: String(formData.get("instagram") ?? ""),
            website: String(formData.get("website") ?? ""),
            other_platforms: String(formData.get("other_platforms") ?? ""),
          },
          objectives,
          subscription_plan: subscriptionPlan,
          objectives_other: String(formData.get("objectives_other") ?? ""),
          activity_description: String(formData.get("activity_description") ?? ""),
          responsible_name: String(formData.get("responsible_name") ?? ""),
          signed_at: String(formData.get("signed_at") ?? ""),
        }
      : {};

  const payload = {
    nom: String(formData.get("nom") ?? ""),
    entreprise: String(formData.get("entreprise") ?? "") || null,
    telephone: String(formData.get("telephone") ?? "") || null,
    email: String(formData.get("email") ?? ""),
    statut: String(formData.get("statut") ?? "prospect"),
    intake_data: intakeData,
    owner_id: user.id,
  };

  await supabase.from("clients").insert(payload);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: `Nouveau client ajoute: ${payload.nom}`,
  });
  revalidatePath("/app/clients");
  revalidatePath("/app");
}

export async function updateClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const nextStatus = String(formData.get("statut") ?? "prospect");

  const readQuery = supabase
    .from("clients")
    .select("id,owner_id,statut,intake_data")
    .eq("id", id);

  if (profile?.role !== "admin") {
    readQuery.eq("owner_id", user.id);
  }

  const { data: current } = await readQuery.maybeSingle();
  if (!current?.id) return;

  const currentStatus = String(current.statut ?? "prospect");
  const intake = (current as unknown as { intake_data?: Record<string, unknown> | null }).intake_data ?? {};

  let nextIntake: Record<string, unknown> | null = null;
  if (nextStatus === "client" && currentStatus !== "client") {
    const existingSubscription = (intake.subscription as Record<string, unknown> | undefined) ?? undefined;
    const plan =
      (existingSubscription?.plan as string | undefined) ??
      (intake.subscription_plan as string | undefined) ??
      "";
    const months = planToMonths(plan);
    const startedAt = new Date().toISOString();
    const endsAt = months ? addMonths(new Date(), months).toISOString() : null;
    nextIntake = {
      ...intake,
      validated_at: startedAt,
      subscription: {
        plan: plan || null,
        started_at: startedAt,
        ends_at: endsAt,
      },
    };
  }

  const updateData: Record<string, unknown> = {
    nom: String(formData.get("nom") ?? ""),
    entreprise: String(formData.get("entreprise") ?? "") || null,
    telephone: String(formData.get("telephone") ?? "") || null,
    email: String(formData.get("email") ?? ""),
    statut: nextStatus,
  };
  if (nextIntake) {
    updateData.intake_data = nextIntake;
  }

  const updateQuery = supabase.from("clients").update(updateData).eq("id", id);
  if (profile?.role !== "admin") {
    updateQuery.eq("owner_id", user.id);
  }
  await updateQuery;

  revalidatePath("/app/clients");
}

export async function deleteClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    revalidatePath("/app");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return;
  }
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const deleteQuery = supabase.from("clients").delete().eq("id", id);
  await deleteQuery;
  revalidatePath("/app/clients");
  revalidatePath("/app");
}

export async function uploadClientDocumentAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "commercial") {
    return;
  }

  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const docType = String(formData.get("doc_type") ?? "");
  const file = formData.get("file");

  if (!clientId || !["cni", "passeport"].includes(docType) || !(file instanceof File)) {
    return;
  }

  const path = `${user.id}/${clientId}/${docType}-${Date.now()}-${file.name}`;
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage.from("client-documents").upload(path, file, {
    upsert: false,
  });
  if (uploadError) {
    redirect(`/app/clients/${clientId}?upload_error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("client_documents").insert({
    owner_id: user.id,
    client_id: clientId,
    doc_type: docType,
    storage_path: path,
    file_name: file.name,
  });

  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${clientId}`);
}

export async function saveClientSignatureAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "commercial") {
    return;
  }

  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "");
  const signatureDataUrl = String(formData.get("signature_data_url") ?? "");

  if (!clientId || !signatureDataUrl.startsWith("data:image/")) {
    return;
  }

  await supabase.from("client_signatures").insert({
    owner_id: user.id,
    client_id: clientId,
    signature_data_url: signatureDataUrl,
  });

  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${clientId}`);
}
