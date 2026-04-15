"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export async function createProjectAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return;
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

export async function takeProjectAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "admin" || profile.role === "commercial") return;

  const projectId = String(formData.get("id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id,assigned_to,statut").eq("id", projectId).single();
  if (!project?.id) return;
  if (project.assigned_to && project.assigned_to !== user.id) return;
  if (project.statut !== "en attente") return;

  await supabase.from("projects").update({ assigned_to: user.id, statut: "en cours" }).eq("id", projectId);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: "Vous avez demarre un projet.",
  });
  revalidatePath("/app/projects");
}

export async function markProjectDoneAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "admin" || profile.role === "commercial") return;

  const projectId = String(formData.get("id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await supabase.from("projects").update({ statut: "termine" }).eq("id", projectId).eq("assigned_to", user.id);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: "Un projet a ete termine.",
  });
  revalidatePath("/app/projects");
}

export async function updateProjectStatusAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/projects");
    return;
  }

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const next = String(formData.get("statut") ?? "en attente");
  const projectId = String(formData.get("id") ?? "");
  if (!projectId) return;

  const q = supabase.from("projects").update({ statut: next }).eq("id", projectId);
  if (profile?.role !== "admin") {
    q.eq("assigned_to", user.id);
  }
  await q;
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

  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return;
  const supabase = await createClient();

  await supabase.from("projects").delete().eq("id", String(formData.get("id")));
  revalidatePath("/app/projects");
  revalidatePath("/app");
}
