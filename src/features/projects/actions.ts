"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export async function createProjectAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const payload = {
    client_id: String(formData.get("client_id") ?? ""),
    nom: String(formData.get("nom") ?? ""),
    type: String(formData.get("type") ?? "site web"),
    statut: String(formData.get("statut") ?? "en attente"),
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    owner_id: user.id,
  };

  await supabase.from("projects").insert(payload);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: `Projet cree: ${payload.nom}`,
  });
  revalidatePath("/app/projects");
  revalidatePath("/app");
}

export async function updateProjectStatusAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("projects")
    .update({ statut: String(formData.get("statut") ?? "en attente") })
    .eq("id", String(formData.get("id")))
    .eq("owner_id", user.id);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: "Un projet a ete mis a jour.",
  });
  revalidatePath("/app/projects");
}

export async function deleteProjectAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("projects")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("owner_id", user.id);
  revalidatePath("/app/projects");
  revalidatePath("/app");
}
