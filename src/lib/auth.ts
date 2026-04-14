import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { mockProfile } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function getCurrentUser() {
  if (isDemoMode) {
    return { id: "demo-user", email: "demo@local.test" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentProfile() {
  if (isDemoMode) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get("demo_role")?.value as Role | undefined;
    const fromEnv = process.env.NEXT_PUBLIC_DEMO_ROLE as Role | undefined;
    const demoRole = fromCookie ?? fromEnv ?? "admin";
    return { ...mockProfile, role: demoRole };
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,role,sales_group,is_blocked,access_reset_at,connection_status,last_login_at,last_logout_at,last_latitude,last_longitude,last_geo_label,created_at",
    )
    .eq("id", user.id)
    .single();

  if (data) {
    return data as Profile;
  }

  const meta = (user as unknown as { user_metadata?: Record<string, unknown> }).user_metadata;
  const fallbackRole = (meta?.role as Role | undefined) ?? "dev";
  const fallbackFullName =
    (meta?.full_name as string | undefined) ??
    ((user as unknown as { email?: string }).email ? (user as unknown as { email: string }).email.split("@")[0] : "") ??
    "";

  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fallbackFullName,
    email: ((user as unknown as { email?: string }).email ?? null) as string | null,
    role: fallbackRole,
  });

  const { data: repaired } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,role,sales_group,is_blocked,access_reset_at,connection_status,last_login_at,last_logout_at,last_latitude,last_longitude,last_geo_label,created_at",
    )
    .eq("id", user.id)
    .single();

  return (repaired as Profile | null) ?? null;
}
