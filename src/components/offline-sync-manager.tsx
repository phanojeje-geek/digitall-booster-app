"use client";

import { useEffect, useState } from "react";
import { getOfflineClients, removeOfflineClient } from "@/lib/offline-storage";
import { createClientAction } from "@/features/clients/actions";
import { Loader2, CloudOff } from "lucide-react";

export function OfflineSyncManager() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const check = () => {
      const clients = getOfflineClients();
      setPendingCount(clients.length);
    };

    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingCount > 0 && navigator.onLine && !isSyncing) {
      void sync();
    }
  }, [pendingCount, isSyncing]);

  async function sync() {
    setIsSyncing(true);
    const clients = getOfflineClients();
    
    for (const client of clients) {
      try {
        const formData = new FormData();
        for (const [key, value] of Object.entries(client.formData)) {
          if (typeof value === "object" && value !== null && (value as any).data) {
            const fileData = value as { name: string; type: string; data: string };
            const blob = await fetch(fileData.data).then(r => r.blob());
            formData.append(key, blob, fileData.name);
          } else {
            formData.append(key, value as string);
          }
        }
        
        await createClientAction(formData);
        removeOfflineClient(client.id);
      } catch (e) {
        console.error("Sync failed for client:", client.id, e);
      }
    }
    
    setIsSyncing(false);
    setPendingCount(getOfflineClients().length);
  }

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg animate-pulse">
      {isSyncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Synchronisation de {pendingCount} dossier(s)...
        </>
      ) : (
        <>
          <CloudOff className="h-3 w-3" />
          {pendingCount} dossier(s) en attente de réseau
        </>
      )}
    </div>
  );
}
