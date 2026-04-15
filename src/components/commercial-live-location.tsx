"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Role } from "@/lib/types";

type GeoPayload = {
  latitude: number;
  longitude: number;
  label: string;
};

export function CommercialLiveLocation({ role }: { role: Role }) {
  const latestRef = useRef<GeoPayload | null>(null);
  const sentAtRef = useRef(0);
  const lastPointRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const hiddenRef = useRef(false);

  const minIntervalMs = useMemo(() => 25000, []);
  const maxSilenceMs = useMemo(() => 2 * 60 * 1000, []);
  const minMoveMeters = useMemo(() => 25, []);

  const metersBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  useEffect(() => {
    if (role !== "commercial") return;
    if (!("geolocation" in navigator)) return;

    let mounted = true;
    const push = async (payload: GeoPayload) => {
      if (!mounted) return;
      if (hiddenRef.current) return;
      const now = Date.now();
      const lastPoint = lastPointRef.current;
      const movedEnough =
        !lastPoint ||
        metersBetween(lastPoint, { latitude: payload.latitude, longitude: payload.longitude }) >= minMoveMeters;
      const stale = now - sentAtRef.current >= maxSilenceMs;
      if (!movedEnough && !stale) return;
      if (now - sentAtRef.current < minIntervalMs && !stale) return;
      sentAtRef.current = now;
      latestRef.current = payload;
      lastPointRef.current = { latitude: payload.latitude, longitude: payload.longitude };
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
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 12000,
      },
    );

    const onVisibility = () => {
      hiddenRef.current = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const heartbeat = window.setInterval(() => {
      if (latestRef.current) {
        void push(latestRef.current);
      }
    }, 30000);

    return () => {
      mounted = false;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [maxSilenceMs, minIntervalMs, minMoveMeters, role]);

  return null;
}
