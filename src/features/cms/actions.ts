"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export async function upsertPageContentAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/cms");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const section = String(formData.get("section") ?? "");
  const rawContent = String(formData.get("contenu") ?? "{}");

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    parsed = { text: rawContent };
  }

  await supabase.from("pages_content").upsert({
    id: id || undefined,
    client_id: clientId,
    section,
    contenu: parsed,
    owner_id: user.id,
  });

  revalidatePath("/app/cms");
}
