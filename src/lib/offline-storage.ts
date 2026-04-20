"use client";

const OFFLINE_KEY = "digitall_booster_offline_clients";

export type OfflineClient = {
  id: string;
  timestamp: number;
  formData: any; // Plain object representation of FormData
};

export async function saveClientOffline(data: any) {
  try {
    const existing = getOfflineClients();
    const newItem: OfflineClient = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: Date.now(),
      formData: data,
    };
    existing.push(newItem);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error("Failed to save offline:", e);
    return false;
  }
}

export function getOfflineClients(): OfflineClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeOfflineClient(id: string) {
  try {
    const existing = getOfflineClients();
    const filtered = existing.filter((c) => c.id !== id);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove offline client:", e);
  }
}
