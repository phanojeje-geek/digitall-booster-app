import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AdminLiveFeed } from "@/components/admin-live-feed";
import { getCurrentProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/runtime";
import { createClient } from "@/lib/supabase/server";

export default async function LivePage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    redirect("/app?forbidden=1");
  }

  let initialConnections: Array<{ id: string; user_id: string; status: string; login_at: string }> = [];
  let initialReports: Array<{ id: string; user_id: string; description: string; created_at: string }> = [];

  if (!isDemoMode) {
    const supabase = await createClient();
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("connection_logs").select("id,user_id,status,login_at").order("login_at", { ascending: false }).limit(20),
      supabase
        .from("activity_reports")
        .select("id,user_id,description,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    initialConnections = (c ?? []) as Array<{ id: string; user_id: string; status: string; login_at: string }>;
    initialReports = (r ?? []) as Array<{ id: string; user_id: string; description: string; created_at: string }>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">War Room Live</h1>
        <p className="text-sm text-zinc-500">
          Activite globale en temps reel: connexions utilisateurs, rapports publies et changements operationnels.
        </p>
      </div>
      <Card>
        {isDemoMode ? (
          <p className="text-sm text-zinc-500">Disponible en mode connecte Supabase.</p>
        ) : (
          <AdminLiveFeed initialConnections={initialConnections} initialReports={initialReports} />
        )}
      </Card>
    </div>
  );
}
