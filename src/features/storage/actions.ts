"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export async function uploadClientFileAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/storage");
    return;
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || !clientId) {
    return;
  }

  const path = `${user.id}/${clientId}/${Date.now()}-${file.name}`;
  await supabase.storage.from("client-files").upload(path, file, {
    upsert: false,
  });

  await supabase.from("files_index").insert({
    owner_id: user.id,
    client_id: clientId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
  });

  revalidatePath("/app/storage");
}
