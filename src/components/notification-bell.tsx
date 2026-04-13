"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { mockNotifications } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
};

export function NotificationBell() {
  const supabase = useMemo(() => (isDemoMode ? null : createClient()), []);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(
    isDemoMode ? (mockNotifications as NotificationItem[]) : [],
  );

  useEffect(() => {
    if (!supabase) return;

    void supabase
      .from("notifications")
      .select("id,message,created_at,read")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setItems((data ?? []) as NotificationItem[]));

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const incoming = payload.new as NotificationItem;
          setItems((prev) => [incoming, ...prev].slice(0, 10));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [supabase]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
        <Bell size={16} />
        {unread > 0 ? (
          <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
            {unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <p className="mb-2 text-sm font-semibold">Notifications</p>
          <div className="space-y-2">
            {items.length === 0 ? <p className="text-sm text-zinc-500">Aucune notification.</p> : null}
            {items.map((item) => (
              <div key={item.id} className="rounded-xl bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
                {item.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
