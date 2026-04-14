"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const payload = {
    nom: String(formData.get("nom") ?? ""),
    entreprise: String(formData.get("entreprise") ?? "") || null,
    telephone: String(formData.get("telephone") ?? "") || null,
    email: String(formData.get("email") ?? ""),
    statut: String(formData.get("statut") ?? "prospect"),
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
  const supabase = await createClient();
  const id = String(formData.get("id"));

  await supabase
    .from("clients")
    .update({
      nom: String(formData.get("nom") ?? ""),
      entreprise: String(formData.get("entreprise") ?? "") || null,
      telephone: String(formData.get("telephone") ?? "") || null,
      email: String(formData.get("email") ?? ""),
      statut: String(formData.get("statut") ?? "prospect"),
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath("/app/clients");
}

export async function deleteClientAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/clients");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));

  await supabase.from("clients").delete().eq("id", id).eq("owner_id", user.id);
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
  if (!profile || !["commercial", "admin"].includes(profile.role)) {
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
  if (!profile || !["commercial", "admin"].includes(profile.role)) {
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
