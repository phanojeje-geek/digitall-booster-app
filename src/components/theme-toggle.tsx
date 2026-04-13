"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("theme-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("theme-change", handler);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("theme") === "dark";
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <Button variant="ghost" onClick={toggle} aria-label="Basculer le theme">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
