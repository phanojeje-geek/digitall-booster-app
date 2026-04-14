"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createActivityReportAction(formData: FormData) {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  const projectId = String(formData.get("project_id") ?? "");
  const description = String(formData.get("description") ?? "");
  const status = String(formData.get("status") ?? "en cours");
  const screenshot = formData.get("screenshot");

  if (!projectId || !description || !(screenshot instanceof File)) {
    return;
  }

  if (isDemoMode) {
    revalidatePath("/app/activity");
    revalidatePath("/app");
    return;
  }

  const supabase = await createClient();

  if (profile?.role !== "admin") {
    const { data: project } = await supabase
      .from("projects")
      .select("id,owner_id,assigned_to")
      .eq("id", projectId)
      .single();

    const allowed = project && (project.owner_id === user.id || project.assigned_to === user.id);
    if (!allowed) return;
  }

  const path = `${user.id}/${projectId}/${Date.now()}-${screenshot.name}`;
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage.from("activity-reports").upload(path, screenshot, {
    upsert: false,
  });

  if (uploadError) return;

  await supabase.from("activity_reports").insert({
    project_id: projectId,
    user_id: user.id,
    description,
    screenshot_path: path,
    status,
  });

  await supabase.from("notifications").insert({
    owner_id: user.id,
    message: `Nouveau rapport d'activite publie.`,
  });

  revalidatePath("/app/activity");
  revalidatePath("/app");
}
