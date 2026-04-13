"use client";

import { Eye } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

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
  return localStorage.getItem("contrast") === "high";
}

export function ContrastToggle() {
  const highContrast = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("hc", highContrast);
  }, [highContrast]);

  const toggleContrast = () => {
    const next = !highContrast;
    localStorage.setItem("contrast", next ? "high" : "normal");
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
