"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const allowedRoles: Role[] = ["admin", "commercial", "marketing", "dev", "designer"];

export async function bootstrapStorageBucketsAction() {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;
  if (isDemoMode) return;

  const adminClient = createAdminClient();
  const { data: buckets } = await adminClient.storage.listBuckets();
  const existing = new Set((buckets ?? []).map((b) => b.name));

  const desired = ["client-documents", "client-files", "activity-reports"] as const;
  for (const name of desired) {
    if (existing.has(name)) continue;
    await adminClient.storage.createBucket(name, {
      public: false,
      allowedMimeTypes: undefined,
      fileSizeLimit: undefined,
    });
  }

  revalidatePath("/app/users");
}

export async function createUserAccountAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") redirect("/app?forbidden=1");
  if (isDemoMode) redirect("/app/users?demo=1");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "dev") as Role;
  const salesGroup = String(formData.get("sales_group") ?? "groupe-a");

  if (!email || !email.includes("@") || password.length < 8 || !fullName) {
    redirect("/app/users?error=invalid");
  }

  if (!allowedRoles.includes(role)) {
    redirect("/app/users?error=role");
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (error || !data.user?.id) {
      redirect("/app/users?error=create");
    }

    const userId = data.user.id;
    await adminClient.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      email,
      role,
      sales_group: role === "commercial" && ["groupe-a", "groupe-b", "groupe-c"].includes(salesGroup) ? salesGroup : undefined,
    });
  } finally {
    revalidatePath("/app/users");
  }
  redirect("/app/users?created=1");
}

export async function updateUserRoleAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") {
    return;
  }

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "dev") as Role;

  if (!userId || !allowedRoles.includes(role)) {
    return;
  }

  if (!isDemoMode) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ role }).eq("id", userId);
  } else if (userId === "demo-user") {
    const cookieStore = await cookies();
    cookieStore.set("demo_role", role, {
      path: "/",
      sameSite: "lax",
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/users");
}

export async function toggleUserBlockAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;

  const userId = String(formData.get("user_id") ?? "");
  const next = String(formData.get("next") ?? "false") === "true";
  if (!userId) return;

  if (!isDemoMode) {
    const supabase = await createClient();
    const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if ((target?.role as Role | undefined) === "admin") {
      return;
    }
    await supabase.from("profiles").update({ is_blocked: next }).eq("id", userId);
  }

  revalidatePath("/app/users");
}

export async function updateUserPasswordAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;
  if (isDemoMode) return;

  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) return;

  const adminClient = createAdminClient();
  try {
    await adminClient.auth.admin.updateUserById(userId, { password });
    await adminClient.from("profiles").update({ access_reset_at: new Date().toISOString() }).eq("id", userId);
    revalidatePath("/app/users");
  } catch {
    redirect("/app/users?error=password");
  }

  redirect("/app/users?password=1");
}

export async function resetUserAccessAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;

  if (isDemoMode) {
    redirect("/app/users?demo=1");
  }

  try {
    const supabase = await createClient();
    const { data: target } = await supabase.from("profiles").select("email").eq("id", userId).single();
    await supabase.from("profiles").update({ access_reset_at: new Date().toISOString() }).eq("id", userId);

    if (target?.email) {
      const headerStore = await headers();
      const origin =
        headerStore.get("origin") ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";
      await supabase.auth.resetPasswordForEmail(target.email, {
        redirectTo: `${origin}/reset-password`,
      });
    }

    revalidatePath("/app/users");
    redirect("/app/users?reset=1");
  } catch {
    redirect("/app/users?error=reset");
  }
}

export async function updateCommercialGroupAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;

  const userId = String(formData.get("user_id") ?? "");
  const salesGroup = String(formData.get("sales_group") ?? "");
  if (!userId || !["groupe-a", "groupe-b", "groupe-c"].includes(salesGroup)) return;

  if (!isDemoMode) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ sales_group: salesGroup }).eq("id", userId);
  }

  revalidatePath("/app/users");
}

export async function sendAdminNotificationAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;

  const title = String(formData.get("title") ?? "");
  const message = String(formData.get("message") ?? "");
  const scope = String(formData.get("scope") ?? "global");
  const targetRole = String(formData.get("target_role") ?? "");
  const targetUserId = String(formData.get("target_user_id") ?? "");

  if (!message || !["global", "role", "user"].includes(scope)) return;

  if (!isDemoMode) {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      sender_id: currentProfile.id,
      scope,
      target_role: scope === "role" ? targetRole || null : null,
      target_user_id: scope === "user" ? targetUserId || null : null,
      owner_id: scope === "user" ? targetUserId || null : null,
      title: title || null,
      message,
      read: false,
    });
  }

  revalidatePath("/app/users");
}

export async function deleteUserAction(formData: FormData) {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;

  const userId = String(formData.get("user_id") ?? "");
  if (!userId || userId === currentProfile.id) return;
  if (isDemoMode) return;

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.deleteUser(userId);
  } catch {
    const supabase = await createClient();
    await supabase.from("profiles").update({ is_blocked: true }).eq("id", userId);
  }

  revalidatePath("/app/users");
}

export async function createDefaultAdminAccountAction() {
  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") return;
  if (isDemoMode) return;

  const email = process.env.DEFAULT_ADMIN_EMAIL ?? "phanojeje@gmail.com";
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? "password123";

  const adminClient = createAdminClient();

  const { data: existing } = await adminClient.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (!found) {
    const { data: created } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Phanojeje", role: "admin" },
    });

    if (created.user?.id) {
      const supabase = await createClient();
      await supabase.from("profiles").upsert({
        id: created.user.id,
        full_name: "Phanojeje",
        email,
        role: "admin",
      });
    }
  } else {
    const supabase = await createClient();
    await supabase.from("profiles").update({ role: "admin", email }).eq("id", found.id);
  }

  revalidatePath("/app/users");
}
