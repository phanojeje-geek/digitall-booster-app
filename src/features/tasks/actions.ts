"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export async function createTaskAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/tasks");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const payload = {
    project_id: String(formData.get("project_id") ?? ""),
    titre: String(formData.get("titre") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    statut: String(formData.get("statut") ?? "todo"),
    deadline: String(formData.get("deadline") ?? "") || null,
    owner_id: user.id,
  };

  await supabase.from("tasks").insert(payload);
  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: `Nouvelle tache assignee: ${payload.titre}`,
  });
  revalidatePath("/app/tasks");
  revalidatePath("/app");
}

export async function toggleTaskDoneAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/tasks");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const next = String(formData.get("next"));

  await supabase
    .from("tasks")
    .update({ statut: next })
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath("/app/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/tasks");
    revalidatePath("/app");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const id = String(formData.get("id"));

  await supabase.from("tasks").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/app/tasks");
  revalidatePath("/app");
}
