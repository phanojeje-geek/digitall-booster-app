"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { ComponentType } from "react";
import { divIcon } from "leaflet";
import { createClient } from "@/lib/supabase/browser";

type CommercialPoint = {
  id: string;
  full_name: string | null;
  sales_group?: "groupe-a" | "groupe-b" | "groupe-c";
  connection_status?: "online" | "offline";
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_geo_label?: string | null;
  last_login_at?: string | null;
};

const groupColors: Record<string, string> = {
  "groupe-a": "#3b82f6",
  "groupe-b": "#10b981",
  "groupe-c": "#f59e0b",
};

const SafeMapContainer = MapContainer as unknown as ComponentType<Record<string, unknown>>;
const SafeTileLayer = TileLayer as unknown as ComponentType<Record<string, unknown>>;
const SafeMarker = Marker as unknown as ComponentType<Record<string, unknown>>;

export function CommercialGroupsMap() {
  const [items, setItems] = useState<CommercialPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const load = async () => {
      try {
        const res = await fetch("/api/admin/commercial-locations", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; items?: CommercialPoint[] };
        if (!mounted || !json.ok) return;
        setItems(json.items ?? []);
      } catch {
        // keep silent for UX
      }
    };

    void load();

    const channel = supabase
      .channel("admin-commercial-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void load();
        },
      )
      .subscribe();

    const poll = window.setInterval(() => void load(), 15000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const points = useMemo(
    () =>
      items.filter(
        (item) =>
          typeof item.last_latitude === "number" &&
          typeof item.last_longitude === "number" &&
          Number.isFinite(item.last_latitude) &&
          Number.isFinite(item.last_longitude),
      ),
    [items],
  );

  const center: [number, number] = points.length
    ? [
        points.reduce((sum, p) => sum + (p.last_latitude ?? 0), 0) / points.length,
        points.reduce((sum, p) => sum + (p.last_longitude ?? 0), 0) / points.length,
      ]
    : [48.8566, 2.3522];

  const iconById = useMemo(() => {
    const map: Record<string, ReturnType<typeof divIcon>> = {};
    for (const point of points) {
      const color = groupColors[point.sales_group ?? "groupe-a"] ?? "#3b82f6";
      const label = (point.full_name ?? "").trim() || point.id.slice(0, 6);
      const initials = label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join("");
      map[point.id] = divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:3px solid ${color};background:white;color:#111827;font-weight:700;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,0.18)">${initials || "•"}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -14],
      });
    }
    return map;
  }, [points]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Legend color={groupColors["groupe-a"]} label="groupe-a" />
        <Legend color={groupColors["groupe-b"]} label="groupe-b" />
        <Legend color={groupColors["groupe-c"]} label="groupe-c" />
      </div>

      <div className="h-[380px] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <SafeMapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
          <SafeTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((point) => {
            return (
              <SafeMarker
                key={point.id}
                position={[point.last_latitude as number, point.last_longitude as number]}
                icon={iconById[point.id]}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{point.full_name ?? point.id}</p>
                    <p>Groupe: {point.sales_group ?? "groupe-a"}</p>
                    <p>Statut: {point.connection_status ?? "offline"}</p>
                    <p>Position: {point.last_geo_label ?? "N/A"}</p>
                    <p>Derniere connexion: {point.last_login_at ? new Date(point.last_login_at).toLocaleString("fr-FR") : "N/A"}</p>
                  </div>
                </Popup>
              </SafeMarker>
            );
          })}
        </SafeMapContainer>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
