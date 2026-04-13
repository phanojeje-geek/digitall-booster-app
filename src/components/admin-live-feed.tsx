"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type LiveEvent = {
  id: string;
  type: "connection" | "report";
  message: string;
  created_at: string;
};

export function AdminLiveFeed({
  initialConnections,
  initialReports,
}: {
  initialConnections: Array<{ id: string; user_id: string; status: string; login_at: string }>;
  initialReports: Array<{ id: string; user_id: string; description: string; created_at: string }>;
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [reports, setReports] = useState(initialReports);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-live-war-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connection_logs" },
        (payload) => {
          const row = payload.new as { id?: string; user_id?: string; status?: string; login_at?: string } | null;
          if (!row?.id || !row.login_at) return;
          setConnections((prev) => {
            const next = [{ id: row.id!, user_id: row.user_id ?? "unknown", status: row.status ?? "online", login_at: row.login_at! }, ...prev];
            return next.slice(0, 40);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_reports" },
        (payload) => {
          const row =
            (payload.new as { id?: string; user_id?: string; description?: string; created_at?: string } | null) ??
            null;
          if (!row?.id || !row.created_at) return;
          setReports((prev) => {
            const next = [{ id: row.id!, user_id: row.user_id ?? "unknown", description: row.description ?? "", created_at: row.created_at! }, ...prev];
            return next.slice(0, 40);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const events = useMemo<LiveEvent[]>(() => {
    const c = connections.map((x) => ({
      id: `conn-${x.id}`,
      type: "connection" as const,
      message: `${x.user_id} est ${x.status}`,
      created_at: x.login_at,
    }));
    const r = reports.map((x) => ({
      id: `rep-${x.id}`,
      type: "report" as const,
      message: `${x.user_id}: ${x.description}`,
      created_at: x.created_at,
    }));
    return [...c, ...r]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 60);
  }, [connections, reports]);

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className={`rounded-xl border p-2 text-sm ${
            event.type === "connection"
              ? "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900/60 dark:bg-indigo-950/30"
              : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
          }`}
        >
          <p className="font-medium">{event.message}</p>
          <p className="text-xs text-zinc-500">{new Date(event.created_at).toLocaleString("fr-FR")}</p>
        </div>
      ))}
      {events.length === 0 ? <p className="text-sm text-zinc-500">Aucun evenement pour le moment.</p> : null}
    </div>
  );
}
