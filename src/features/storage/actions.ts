"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function toTrashPath(originalPath: string) {
  return `trash/${encodeURIComponent(originalPath)}`;
}

function fromTrashPath(trashPath: string) {
  if (!trashPath.startsWith("trash/")) return null;
  const encoded = trashPath.slice("trash/".length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

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
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage.from("client-files").upload(path, file, {
    upsert: false,
  });
  if (uploadError) {
    redirect(`/app/storage?upload_error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("files_index").insert({
    owner_id: user.id,
    client_id: clientId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
  });

  revalidatePath("/app/storage");
}

export async function moveProofToTrashAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/storage");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !["client-files", "client-documents", "activity-reports"].includes(kind)) return;

  const admin = createAdminClient();

  if (kind === "client-files") {
    const { data: row } = await admin.from("files_index").select("id,storage_path").eq("id", id).maybeSingle();
    const currentPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    if (!currentPath || currentPath.startsWith("trash/")) return;
    const nextPath = toTrashPath(currentPath);
    await admin.storage.from("client-files").move(currentPath, nextPath);
    await admin.from("files_index").update({ storage_path: nextPath }).eq("id", id);
  }

  if (kind === "client-documents") {
    const { data: row } = await admin.from("client_documents").select("id,storage_path").eq("id", id).maybeSingle();
    const currentPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    if (!currentPath || currentPath.startsWith("trash/")) return;
    const nextPath = toTrashPath(currentPath);
    await admin.storage.from("client-documents").move(currentPath, nextPath);
    await admin.from("client_documents").update({ storage_path: nextPath }).eq("id", id);
  }

  if (kind === "activity-reports") {
    const { data: row } = await admin.from("activity_reports").select("id,screenshot_path").eq("id", id).maybeSingle();
    const currentPath = (row as { screenshot_path?: string } | null)?.screenshot_path ?? "";
    if (!currentPath || currentPath.startsWith("trash/")) return;
    const nextPath = toTrashPath(currentPath);
    await admin.storage.from("activity-reports").move(currentPath, nextPath);
    await admin.from("activity_reports").update({ screenshot_path: nextPath }).eq("id", id);
  }

  revalidatePath("/app/storage");
}

export async function restoreProofFromTrashAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/storage");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !["client-files", "client-documents", "activity-reports"].includes(kind)) return;

  const admin = createAdminClient();

  if (kind === "client-files") {
    const { data: row } = await admin.from("files_index").select("id,storage_path").eq("id", id).maybeSingle();
    const trashPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    const originalPath = fromTrashPath(trashPath);
    if (!originalPath) return;
    await admin.storage.from("client-files").move(trashPath, originalPath);
    await admin.from("files_index").update({ storage_path: originalPath }).eq("id", id);
  }

  if (kind === "client-documents") {
    const { data: row } = await admin.from("client_documents").select("id,storage_path").eq("id", id).maybeSingle();
    const trashPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    const originalPath = fromTrashPath(trashPath);
    if (!originalPath) return;
    await admin.storage.from("client-documents").move(trashPath, originalPath);
    await admin.from("client_documents").update({ storage_path: originalPath }).eq("id", id);
  }

  if (kind === "activity-reports") {
    const { data: row } = await admin.from("activity_reports").select("id,screenshot_path").eq("id", id).maybeSingle();
    const trashPath = (row as { screenshot_path?: string } | null)?.screenshot_path ?? "";
    const originalPath = fromTrashPath(trashPath);
    if (!originalPath) return;
    await admin.storage.from("activity-reports").move(trashPath, originalPath);
    await admin.from("activity_reports").update({ screenshot_path: originalPath }).eq("id", id);
  }

  revalidatePath("/app/storage");
}

export async function deleteProofPermanentlyAction(formData: FormData) {
  if (isDemoMode) {
    revalidatePath("/app/storage");
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return;

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !["client-files", "client-documents", "activity-reports"].includes(kind)) return;

  const admin = createAdminClient();

  if (kind === "client-files") {
    const { data: row } = await admin.from("files_index").select("id,storage_path").eq("id", id).maybeSingle();
    const trashPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    if (!trashPath.startsWith("trash/")) return;
    await admin.storage.from("client-files").remove([trashPath]);
    await admin.from("files_index").delete().eq("id", id);
  }

  if (kind === "client-documents") {
    const { data: row } = await admin.from("client_documents").select("id,storage_path").eq("id", id).maybeSingle();
    const trashPath = (row as { storage_path?: string } | null)?.storage_path ?? "";
    if (!trashPath.startsWith("trash/")) return;
    await admin.storage.from("client-documents").remove([trashPath]);
    await admin.from("client_documents").delete().eq("id", id);
  }

  if (kind === "activity-reports") {
    const { data: row } = await admin.from("activity_reports").select("id,screenshot_path").eq("id", id).maybeSingle();
    const trashPath = (row as { screenshot_path?: string } | null)?.screenshot_path ?? "";
    if (!trashPath.startsWith("trash/")) return;
    await admin.storage.from("activity-reports").remove([trashPath]);
    await admin.from("activity_reports").delete().eq("id", id);
  }

  revalidatePath("/app/storage");
}
