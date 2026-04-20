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

function readRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

export async function createClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    revalidatePath("/app");
    return;
  }

  try {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "commercial") {
      throw new Error("Non autorisé");
    }
    const supabase = await createClient();

    const objectives = formData.getAll("objectives").map((v) => String(v)).filter(Boolean);
    const subscriptionPlan = String(formData.get("subscription_plan") ?? "");
    const months = planToMonths(subscriptionPlan);
    const startedAt = new Date().toISOString();
    const endsAt = months ? addMonths(new Date(startedAt), months).toISOString() : null;
    
    const intakeData = {
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
      validated_at: startedAt,
      subscription: {
        plan: subscriptionPlan || null,
        started_at: startedAt,
        ends_at: endsAt,
      },
    };

    const payload = {
      nom: String(formData.get("nom") ?? ""),
      entreprise: String(formData.get("entreprise") ?? "") || null,
      telephone: String(formData.get("telephone") ?? "") || null,
      email: String(formData.get("email") ?? ""),
      statut: "client",
      intake_data: intakeData,
      owner_id: user.id,
    };

    const { data: newClient, error: clientError } = await supabase.from("clients").insert(payload).select("id").single();
    if (clientError || !newClient) {
      throw new Error(clientError?.message || "Erreur lors de la création du client");
    }

    // Handle signature
    const signatureDataUrl = String(formData.get("signature_data_url") ?? "");
    if (signatureDataUrl) {
      await supabase.from("client_signatures").insert({
        owner_id: user.id,
        client_id: newClient.id,
        signature_data_url: signatureDataUrl,
      });
    }

    // Handle documents
    const docFields = ["doc_cni_recto", "doc_cni_verso", "doc_passeport", "doc_autre"];
    const adminClient = createAdminClient();
    
    for (const field of docFields) {
      const file = formData.get(field);
      if (file instanceof File && file.size > 0) {
        let docType = field.replace("doc_", "");
        if (docType === "autre") docType = "document";
        // Normalize filename: remove spaces and non-ascii
        const safeName = file.name.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
        const path = `${user.id}/${newClient.id}/${docType}-${Date.now()}-${safeName}`;
        
        const { error: uploadError } = await adminClient.storage.from("client-documents").upload(path, file);
        if (!uploadError) {
          await supabase.from("client_documents").insert({
            owner_id: user.id,
            client_id: newClient.id,
            doc_type: docType,
            storage_path: path,
            file_name: file.name,
          });
        }
      }
    }

    await supabase.from("notifications").insert({
      owner_id: user.id,
      message: `Nouveau client ajouté: ${payload.nom}`,
    });

    revalidatePath("/app/clients");
    revalidatePath("/app");
  } catch (error) {
    console.error("Critical error in createClientAction:", error);
    // In Server Actions, throwing triggers the error boundary
    throw error;
  }
  
  redirect("/app/clients");
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
  const requestedStatus = String(formData.get("statut") ?? "client");
  const nextStatus = profile?.role === "admin" ? requestedStatus : "client";
  const allowed = new Set(["prospect", "client"]);
  const normalizedStatus = allowed.has(nextStatus) ? nextStatus : "client";

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
  if (normalizedStatus === "client" && currentStatus !== "client") {
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
    statut: normalizedStatus,
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

  const allowedTypes = ["cni", "passeport", "cni_recto", "cni_verso", "document"];
  if (!clientId || !allowedTypes.includes(docType) || !(file instanceof File)) {
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

  if (!clientId || (!signatureDataUrl.startsWith("data:image/") && signatureDataUrl !== "CONSENT_CHECKED")) {
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

export async function updateClientSubscriptionAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const clientId = String(formData.get("client_id") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!clientId || !plan) return;

  const months = planToMonths(plan);
  const supabase = await createClient();
  const { data: row } = await supabase.from("clients").select("id,intake_data").eq("id", clientId).maybeSingle();
  if (!row?.id) return;

  const intake = readRecord((row as unknown as { intake_data?: unknown }).intake_data);
  const prevSub = readRecord(intake.subscription);
  const startedAtRaw =
    (prevSub.started_at as string | undefined) ?? (intake.validated_at as string | undefined) ?? new Date().toISOString();
  const startedAt = new Date(startedAtRaw);
  const startedAtIso = Number.isFinite(startedAt.getTime()) ? startedAt.toISOString() : new Date().toISOString();
  const endsAtIso = months ? addMonths(new Date(startedAtIso), months).toISOString() : null;

  const nextIntake = {
    ...intake,
    validated_at: intake.validated_at ?? startedAtIso,
    subscription: {
      plan,
      started_at: startedAtIso,
      ends_at: endsAtIso,
      notified_days: [],
    },
  };

  await supabase.from("clients").update({ intake_data: nextIntake }).eq("id", clientId);
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${clientId}`);
}

export async function deleteClientSubscriptionAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;

  const supabase = await createClient();
  const { data: row } = await supabase.from("clients").select("id,intake_data").eq("id", clientId).maybeSingle();
  if (!row?.id) return;

  const intake = readRecord((row as unknown as { intake_data?: unknown }).intake_data);
  const nextIntake = { ...intake };
  delete (nextIntake as Record<string, unknown>).subscription;

  await supabase.from("clients").update({ intake_data: nextIntake }).eq("id", clientId);
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${clientId}`);
}

export async function generateSubscriptionAlertsAction() {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("clients")
    .select("id,nom,statut,intake_data")
    .eq("statut", "client")
    .order("created_at", { ascending: false })
    .limit(2000);

  const now = Date.now();
  const alertDays = [7, 3, 1, 0] as const;

  for (const raw of (rows ?? []) as Array<{ id: string; nom: string; statut: string; intake_data: unknown }>) {
    const intake = readRecord(raw.intake_data);
    const sub = readRecord(intake.subscription);
    const endsAt = (sub.ends_at as string | undefined) ?? null;
    if (!endsAt) continue;

    const endsMs = new Date(endsAt).getTime();
    if (!Number.isFinite(endsMs)) continue;
    const daysLeft = Math.max(0, Math.ceil((endsMs - now) / (24 * 60 * 60 * 1000)));
    if (!alertDays.includes(daysLeft as (typeof alertDays)[number])) continue;

    const notified = Array.isArray(sub.notified_days) ? sub.notified_days.filter((n) => typeof n === "number") : [];
    if (notified.includes(daysLeft)) continue;

    const nextSub = {
      ...sub,
      notified_days: [...notified, daysLeft],
    };
    const nextIntake = { ...intake, subscription: nextSub };

    await supabase.from("clients").update({ intake_data: nextIntake }).eq("id", raw.id);
    await supabase.from("notifications").insert({
      sender_id: profile.id,
      scope: "role",
      target_role: "admin",
      target_user_id: null,
      owner_id: null,
      title: "Abonnement",
      message: daysLeft === 0 ? `Abonnement expiré: ${raw.nom}` : `Abonnement: ${raw.nom} arrive à échéance (J-${daysLeft})`,
      read: false,
    });
  }

  revalidatePath("/app/clients");
}
