import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { data: current } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (current?.role !== "admin") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        "id,full_name,role,sales_group,connection_status,last_latitude,last_longitude,last_geo_label,last_login_at",
      )
      .eq("role", "commercial")
      .order("full_name");

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
