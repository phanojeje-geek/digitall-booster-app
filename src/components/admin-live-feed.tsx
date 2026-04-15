"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { Role } from "@/lib/types";

type LiveEvent = {
  id: string;
  type: "connection" | "report";
  message: string;
  created_at: string;
};

export function AdminLiveFeed({
  initialConnections,
  initialReports,
  initialUsers,
}: {
  initialConnections: Array<{ id: string; user_id: string; status: string; login_at: string }>;
  initialReports: Array<{ id: string; user_id: string; description: string; created_at: string }>;
  initialUsers: Array<{ id: string; full_name: string | null; role: Role }>;
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [reports, setReports] = useState(initialReports);
  const [usersById, setUsersById] = useState<Record<string, { full_name: string | null; role: Role }>>(
    Object.fromEntries((initialUsers ?? []).map((u) => [u.id, { full_name: u.full_name ?? null, role: u.role }])),
  );
  const inFlight = useRef<Set<string>>(new Set());
  const usersRef = useRef(usersById);

  useEffect(() => {
    usersRef.current = usersById;
  }, [usersById]);

  useEffect(() => {
    const supabase = createClient();

    const ensureUser = async (userId: string | null | undefined) => {
      if (!userId) return;
      if (usersRef.current[userId]) return;
      if (inFlight.current.has(userId)) return;
      inFlight.current.add(userId);
      const { data } = await supabase.from("profiles").select("id,full_name,role").eq("id", userId).maybeSingle();
      inFlight.current.delete(userId);
      if (!data?.id) return;
      setUsersById((prev) => ({
        ...prev,
        [data.id]: { full_name: (data.full_name as string | null) ?? null, role: (data.role as Role) ?? "dev" },
      }));
    };

    const channel = supabase
      .channel("admin-live-war-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connection_logs" },
        (payload) => {
          const row = payload.new as { id?: string; user_id?: string; status?: string; login_at?: string } | null;
          if (!row?.id || !row.login_at) return;
          void ensureUser(row.user_id);
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
          void ensureUser(row.user_id);
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

  const displayUser = (userId: string) => {
    const u = usersById[userId];
    if (u?.full_name) return u.full_name;
    if (userId.length > 12) return `${userId.slice(0, 8)}…`;
    return userId;
  };

  const events: LiveEvent[] = [...connections, ...reports]
    .map((x) => {
      if ("login_at" in x) {
        return {
          id: `conn-${x.id}`,
          type: "connection" as const,
          message: `${displayUser(x.user_id)} est ${x.status}`,
          created_at: x.login_at,
        };
      }
      return {
        id: `rep-${x.id}`,
        type: "report" as const,
        message: `${displayUser(x.user_id)}: ${x.description}`,
        created_at: x.created_at,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 60);

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
