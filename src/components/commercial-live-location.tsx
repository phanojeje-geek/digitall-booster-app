"use client";

import { useEffect, useRef } from "react";
import type { Role } from "@/lib/types";

type GeoPayload = {
  latitude: number;
  longitude: number;
  label: string;
};

export function CommercialLiveLocation({ role }: { role: Role }) {
  const latestRef = useRef<GeoPayload | null>(null);
  const sentAtRef = useRef(0);

  useEffect(() => {
    if (role !== "commercial") return;
    if (!("geolocation" in navigator)) return;

    let mounted = true;
    const push = async (payload: GeoPayload) => {
      if (!mounted) return;
      const now = Date.now();
      if (now - sentAtRef.current < 8000) return;
      sentAtRef.current = now;
      latestRef.current = payload;
      try {
        await fetch("/api/presence/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // Silent fail: tracking should never break user flow.
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        void push({
          latitude,
          longitude,
          label: `lat:${latitude}, lng:${longitude}`,
        });
      },
      () => {
        // Ignore geolocation errors in UI flow
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      },
    );

    const heartbeat = window.setInterval(() => {
      if (latestRef.current) {
        void push(latestRef.current);
      }
    }, 30000);

    return () => {
      mounted = false;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeat);
    };
  }, [role]);

  return null;
}
