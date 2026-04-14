"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function signUpAction(formData: FormData) {
  void formData;
  if (isDemoMode) {
    redirect("/login?error=Inscription%20desactivee");
  }
  redirect("/login?error=Inscription%20desactivee.%20Contactez%20un%20administrateur.");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const geoLatRaw = String(formData.get("geo_lat") ?? "");
  const geoLngRaw = String(formData.get("geo_lng") ?? "");
  const geoLabel = String(formData.get("geo_label") ?? "");

  if (isDemoMode) {
    redirect("/login?error=Mode%20demo%20desactive.%20Configurez%20Supabase%20pour%20les%20comptes%20reels");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.user;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = (profile?.role as Role | undefined) ?? "dev";
    const now = new Date().toISOString();
    const latitude = geoLatRaw ? Number(geoLatRaw) : null;
    const longitude = geoLngRaw ? Number(geoLngRaw) : null;
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent");
    const ipAddress = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip");

    await supabase
      .from("connection_logs")
      .update({ status: "offline", logout_at: now })
      .eq("user_id", user.id)
      .is("logout_at", null);

    await supabase.from("profiles").update({
      connection_status: "online",
      last_login_at: now,
      last_latitude: latitude,
      last_longitude: longitude,
      last_geo_label: geoLabel || null,
    }).eq("id", user.id);

    await supabase.from("connection_logs").insert({
      user_id: user.id,
      role,
      status: "online",
      login_at: now,
      latitude,
      longitude,
      geo_label: geoLabel || null,
      user_agent: userAgent,
      ip_address: ipAddress,
    });
  }

  redirect("/app");
}

export async function signOutAction() {
  if (isDemoMode) {
    const cookieStore = await cookies();
    cookieStore.delete("demo_role");
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ connection_status: "offline", last_logout_at: now }).eq("id", user.id);
    await supabase
      .from("connection_logs")
      .update({ status: "offline", logout_at: now })
      .eq("user_id", user.id)
      .is("logout_at", null);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
