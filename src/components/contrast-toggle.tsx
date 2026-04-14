"use client";

import { Eye } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("contrast-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("contrast-change", handler);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("contrast");
    if (stored) return stored === "high";
  } catch {
    // ignore
  }
  const cookie = getCookieValue("contrast");
  if (cookie) return cookie === "high";
  return document.documentElement.classList.contains("hc");
}

export function ContrastToggle() {
  const highContrast = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("hc", highContrast);
  }, [highContrast]);

  const toggleContrast = () => {
    const next = !highContrast;
    try {
      localStorage.setItem("contrast", next ? "high" : "normal");
    } catch {
      // ignore
    }
    document.cookie = `contrast=${encodeURIComponent(next ? "high" : "normal")}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.classList.toggle("hc", next);
    window.dispatchEvent(new Event("contrast-change"));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="Activer le contraste eleve"
      title="Contraste eleve"
      onClick={toggleContrast}
      className={highContrast ? "ring-2 ring-indigo-400/70" : undefined}
    >
      <Eye size={16} />
    </Button>
  );
}
