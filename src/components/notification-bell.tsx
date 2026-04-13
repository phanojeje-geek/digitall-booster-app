"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { mockNotifications } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  title: string | null;
  message: string;
  created_at: string;
  read: boolean;
  scope: "global" | "role" | "user";
  target_role: string | null;
  target_user_id: string | null;
};

export function NotificationBell() {
  const supabase = useMemo(() => (isDemoMode ? null : createClient()), []);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(
    isDemoMode ? (mockNotifications as NotificationItem[]) : [],
  );

  useEffect(() => {
    if (!supabase) return;

    let currentUserId = "";
    let currentRole = "";

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      currentUserId = user.id;

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      currentRole = profile?.role ?? "";

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id,title,message,created_at,read,scope,target_role,target_user_id,owner_id")
        .order("created_at", { ascending: false })
        .limit(30);

      const filtered = ((notifications ?? []) as Array<NotificationItem & { owner_id?: string | null }>).filter(
        (item) =>
          item.target_user_id === currentUserId ||
          item.scope === "global" ||
          (item.scope === "role" && item.target_role === currentRole) ||
          item.owner_id === currentUserId,
      );

      const { data: reads } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", currentUserId);
      const readSet = new Set((reads ?? []).map((r) => r.notification_id));

      setItems(
        filtered
          .slice(0, 10)
          .map((item) => ({
            ...item,
            read: item.read || readSet.has(item.id),
          })),
      );
    };

    void load();

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_reads" },
        () => void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [supabase]);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!supabase) {
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const unreadItems = items.filter((item) => !item.read);
    if (!unreadItems.length) return;

    await supabase.from("notification_reads").upsert(
      unreadItems.map((item) => ({
        notification_id: item.id,
        user_id: user.id,
      })),
    );
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }

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
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Button type="button" variant="ghost" onClick={() => void markAllRead()}>
              Tout lire
            </Button>
          </div>
          <div className="space-y-2">
            {items.length === 0 ? <p className="text-sm text-zinc-500">Aucune notification.</p> : null}
            {items.map((item) => (
              <div key={item.id} className="rounded-xl bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
                {item.title ? <p className="font-semibold">{item.title}</p> : null}
                {item.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
