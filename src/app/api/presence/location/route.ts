import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_blocked")
      .eq("id", user.id)
      .single();

    if (!profile || profile.is_blocked) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    if (profile.role !== "commercial") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const body = (await request.json()) as {
      latitude?: number;
      longitude?: number;
      label?: string;
    };

    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;
    const label = typeof body.label === "string" ? body.label : null;
    const now = new Date().toISOString();

    await supabase
      .from("profiles")
      .update({
        connection_status: "online",
        last_login_at: now,
        last_latitude: latitude,
        last_longitude: longitude,
        last_geo_label: label,
      })
      .eq("id", user.id);

    const { data: openLog } = await supabase
      .from("connection_logs")
      .select("id")
      .eq("user_id", user.id)
      .is("logout_at", null)
      .order("login_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openLog?.id) {
      await supabase
        .from("connection_logs")
        .update({
          status: "online",
          latitude,
          longitude,
          geo_label: label,
        })
        .eq("id", openLog.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
