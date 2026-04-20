"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [geoState, setGeoState] = useState<"unknown" | "unsupported" | "denied" | "granted">("unknown");

  const minIntervalMs = useMemo(() => 15000, []);
  const maxSilenceMs = useMemo(() => 2 * 60 * 1000, []);
  const minMoveMeters = useMemo(() => 10, []);

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
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setGeoState("unsupported"));
      return;
    }

    const permissionsApi = (navigator as unknown as { permissions?: Permissions }).permissions;
    if (permissionsApi?.query) {
      permissionsApi
        .query({ name: "geolocation" as PermissionName })
        .then((res) => {
          if (res.state === "denied") setGeoState("denied");
          if (res.state === "granted") setGeoState("granted");
        })
        .catch(() => undefined);
    }

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
        setGeoState("granted");
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        void push({
          latitude,
          longitude,
          label: `lat:${latitude}, lng:${longitude}`,
        });
      },
      () => {
        setGeoState("denied");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
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

  if (role !== "commercial") return null;
  if (geoState === "denied" || geoState === "unsupported") {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!("geolocation" in navigator)) {
              setGeoState("unsupported");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              () => setGeoState("granted"),
              () => setGeoState("denied"),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
            );
          }}
        >
          Activer localisation
        </Button>
      </div>
    );
  }

  return null;
}
