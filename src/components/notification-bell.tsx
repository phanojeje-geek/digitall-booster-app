"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { mockNotifications } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime";
import { Button } from "@/components/ui/button";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

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
  const [view, setView] = useState<"inbox" | "trash">("inbox");
  const [items, setItems] = useState<NotificationItem[]>(
    isDemoMode ? (mockNotifications as NotificationItem[]) : [],
  );
  const [pendingProjects, setPendingProjects] = useState(0);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem("notif_sound_enabled") !== "0";
    } catch {
      return true;
    }
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const didInitialLoadRef = useRef(false);
  const lastActiveIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("notif_sound_enabled", soundEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      void ctx.resume().catch(() => undefined);
      audioUnlockedRef.current = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 740;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }, [soundEnabled]);

  const sendNativeNotification = useCallback(
    async (title: string, body: string) => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: "beep.wav",
              attachments: [],
              actionTypeId: "",
              extra: null,
            },
          ],
        });
      } catch (e) {
        console.error("Native notification error:", e);
      }
    },
    [],
  );

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void LocalNotifications.checkPermissions().then((perm) => {
        if (perm.display !== "granted") {
          void LocalNotifications.requestPermissions();
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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

      const readsResult = await supabase
        .from("notification_reads")
        .select("notification_id,trashed_at,deleted_at")
        .eq("user_id", currentUserId);
      const readsFallbackResult = readsResult.error
        ? await supabase.from("notification_reads").select("notification_id").eq("user_id", currentUserId)
        : null;
      const reads = (readsResult.error ? readsFallbackResult?.data : readsResult.data) ?? [];
      const readSet = new Set(reads.map((r) => r.notification_id));
      const trashedSet = new Set(reads.filter((r) => Boolean((r as { trashed_at?: string | null }).trashed_at)).map((r) => r.notification_id));
      const deletedSet = new Set(reads.filter((r) => Boolean((r as { deleted_at?: string | null }).deleted_at)).map((r) => r.notification_id));

      const active = filtered
        .filter((item) => !deletedSet.has(item.id))
        .filter((item) => !trashedSet.has(item.id))
        .filter((item) => (item as { owner_id?: string | null }).owner_id !== currentUserId);
      const activeIds = new Set(active.map((n) => n.id));
      const hasNew = Array.from(activeIds).some((id) => !lastActiveIdsRef.current.has(id));
      const newItems = active.filter((n) => !lastActiveIdsRef.current.has(n.id));
      
      lastActiveIdsRef.current = activeIds;
      if (didInitialLoadRef.current && hasNew) {
        if (document.visibilityState === "visible") {
          playBeep();
        }
        if (newItems.length > 0) {
          const first = newItems[0]!;
          void sendNativeNotification(first.title || "Nouvelle notification", first.message);
        }
      }
      didInitialLoadRef.current = true;

      const visible = filtered
        .filter((item) => !deletedSet.has(item.id))
        .filter((item) => (view === "trash" ? trashedSet.has(item.id) : !trashedSet.has(item.id)))
        .slice(0, 10)
        .map((item) => ({
          ...item,
          read: item.read || readSet.has(item.id),
        }));

      setItems(visible);

      if (currentRole && !["admin", "commercial"].includes(currentRole)) {
        const { count } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en attente")
          .is("assigned_to", null);
        setPendingProjects(count ?? 0);
      } else {
        setPendingProjects(0);
      }
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
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => void load())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeOk(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeOk(false);
      });

    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const intervalMs = open ? 4000 : 15000;
    const poll = window.setInterval(() => void load(), intervalMs);

    return () => {
      supabase.removeChannel(channel).catch(() => undefined);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
    };
  }, [open, playBeep, supabase, view]);

  const unread = items.filter((n) => !n.read).length;
  const badgeCount = unread + pendingProjects;

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

  async function moveToTrash(notificationId: string) {
    if (!supabase) {
      setItems((prev) => prev.filter((i) => i.id !== notificationId));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("notification_reads").upsert(
      {
        notification_id: notificationId,
        user_id: user.id,
        read_at: now,
        trashed_at: now,
        deleted_at: null,
      },
      { onConflict: "notification_id,user_id" },
    );
    setItems((prev) => prev.filter((i) => i.id !== notificationId));
  }

  async function restoreFromTrash(notificationId: string) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notification_reads")
      .update({ trashed_at: null, deleted_at: null })
      .eq("notification_id", notificationId)
      .eq("user_id", user.id);
    setItems((prev) => prev.filter((i) => i.id !== notificationId));
  }

  async function deleteForever(notificationId: string) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("notification_reads").upsert(
      {
        notification_id: notificationId,
        user_id: user.id,
        deleted_at: now,
        trashed_at: null,
        read_at: now,
      },
      { onConflict: "notification_id,user_id" },
    );
    setItems((prev) => prev.filter((i) => i.id !== notificationId));
  }

  return (
    <div className="relative">
      <Button type="button" variant="ghost" onClick={() => setOpen((v) => !v)} className="relative h-10 w-10 p-0">
        <Bell size={16} />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-content-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/20 md:backdrop-blur-[1px]" />
          <div
            className="fixed right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] w-[min(94vw,26rem)] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 shadow-2xl md:backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:top-[calc(env(safe-area-inset-top)+4rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{view === "trash" ? "Corbeille" : "Notifications"}</p>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" onClick={() => setSoundEnabled((v) => !v)}>
                    Son: {soundEnabled ? "ON" : "OFF"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView((v) => (v === "trash" ? "inbox" : "trash"))}
                  >
                    {view === "trash" ? "Boite" : "Corbeille"}
                  </Button>
                  {view === "inbox" ? (
                    <Button type="button" variant="ghost" onClick={() => void markAllRead()}>
                      Tout lire
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
              {!realtimeOk ? <p className="mt-1 text-xs text-zinc-500">Mise a jour auto (mode degrade).</p> : null}
              {pendingProjects > 0 ? (
                <div className="mt-2 rounded-xl bg-indigo-50 p-2 text-sm text-indigo-900">
                  Projets en attente: <span className="font-semibold">{pendingProjects}</span>
                </div>
              ) : null}
            </div>

            <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-3">
              <div className="space-y-2">
                {items.length === 0 ? <p className="text-sm text-zinc-500">Aucune notification.</p> : null}
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        {item.title ? <p className="truncate font-semibold">{item.title}</p> : null}
                        <p className="whitespace-pre-wrap wrap-break-word text-sm">{item.message}</p>
                      </div>
                      {view === "trash" ? (
                        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:gap-1">
                          <Button type="button" variant="ghost" onClick={() => void restoreFromTrash(item.id)}>
                            Restaurer
                          </Button>
                          <Button type="button" variant="danger" onClick={() => void deleteForever(item.id)}>
                            Suppr.
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end sm:block">
                          <Button type="button" variant="ghost" onClick={() => void moveToTrash(item.id)}>
                            Suppr.
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
