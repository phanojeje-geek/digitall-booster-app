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

  return (data as Profile | null) ?? null;
}
