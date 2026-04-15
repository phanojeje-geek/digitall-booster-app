"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; nom: string };

async function toWebp(file: File, maxSide: number, quality: number) {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml") return file;
  if (file.type === "image/webp") return file;

  const createBitmap = async () => {
    if ("createImageBitmap" in window) {
      return await createImageBitmap(file);
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("image-load-failed"));
        el.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-canvas");
      ctx.drawImage(img, 0, 0);
      return await createImageBitmap(canvas);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  try {
    const bitmap = await createBitmap();
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return file;

    const base = file.name.replace(/\.[^./\\]+$/, "");
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function ClientFilesUploader({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(clientId && file && !busy);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!clientId || !file) return;
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expirée. Reconnectez-vous.");
        return;
      }

      const converted = await toWebp(file, 1600, 0.82);
      const path = `${user.id}/${clientId}/${Date.now()}-${converted.name}`;
      const { error: uploadError } = await supabase.storage.from("client-files").upload(path, converted, {
        upsert: false,
      });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("files_index").insert({
        owner_id: user.id,
        client_id: clientId,
        storage_path: path,
        file_name: converted.name,
        mime_type: converted.type,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }

      setFile(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <select
        name="client_id"
        required
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="h-10 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">Sélectionner un client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.nom}
          </option>
        ))}
      </select>
      <input
        name="file"
        type="file"
        required
        accept="image/*,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="h-10 w-full min-w-0 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
      />
      <Button type="submit" disabled={!canSubmit}>
        {busy ? "Téléversement..." : "Téléverser"}
      </Button>
      {error ? <p className="md:col-span-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </form>
  );
}

type DocumentTemplate =
  | "cni_recto_verso"
  | "attestation_recto_verso"
  | "passeport"
  | "document_simple";

function templateToDocTypes(template: DocumentTemplate) {
  switch (template) {
    case "cni_recto_verso":
      return { requiresBothSides: true, recto: "cni_recto", verso: "cni_verso" } as const;
    case "attestation_recto_verso":
      return { requiresBothSides: true, recto: "attestation_recto", verso: "attestation_verso" } as const;
    case "passeport":
      return { requiresBothSides: false, single: "passeport" } as const;
    case "document_simple":
      return { requiresBothSides: false, single: "document" } as const;
  }
}

export function ClientDocumentsUploader({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<DocumentTemplate>("cni_recto_verso");
  const [recto, setRecto] = useState<File | null>(null);
  const [verso, setVerso] = useState<File | null>(null);
  const [single, setSingle] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => templateToDocTypes(template), [template]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!clientId) return false;
    if (mode.requiresBothSides) return Boolean(recto && verso);
    return Boolean(single);
  }, [busy, clientId, mode.requiresBothSides, recto, single, verso]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expirée. Reconnectez-vous.");
        return;
      }

      const uploads: Array<{ file: File; docType: string }> = [];
      if (mode.requiresBothSides) {
        if (!recto || !verso) return;
        uploads.push({ file: recto, docType: mode.recto });
        uploads.push({ file: verso, docType: mode.verso });
      } else {
        if (!single) return;
        uploads.push({ file: single, docType: mode.single });
      }

      for (const item of uploads) {
        const converted = await toWebp(item.file, 1600, 0.82);
        const path = `${user.id}/${clientId}/${item.docType}-${Date.now()}-${converted.name}`;
        const { error: uploadError } = await supabase.storage.from("client-documents").upload(path, converted, {
          upsert: false,
        });
        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { error: insertError } = await supabase.from("client_documents").insert({
          owner_id: user.id,
          client_id: clientId,
          doc_type: item.docType,
          storage_path: path,
          file_name: converted.name,
        });
        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      setRecto(null);
      setVerso(null);
      setSingle(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-4 grid gap-3">
      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value as DocumentTemplate)}
        className="h-10 rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="cni_recto_verso">CNI (recto + verso)</option>
        <option value="attestation_recto_verso">Attestation (recto + verso)</option>
        <option value="passeport">Passeport</option>
        <option value="document_simple">Autre document</option>
      </select>

      {mode.requiresBothSides ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="file"
            required
            accept="image/*"
            capture="environment"
            onChange={(e) => setRecto(e.target.files?.[0] ?? null)}
            className="h-10 w-full min-w-0 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
          />
          <input
            type="file"
            required
            accept="image/*"
            capture="environment"
            onChange={(e) => setVerso(e.target.files?.[0] ?? null)}
            className="h-10 w-full min-w-0 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
      ) : (
        <input
          type="file"
          required
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => setSingle(e.target.files?.[0] ?? null)}
          className="h-10 w-full min-w-0 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
        />
      )}

      <Button type="submit" disabled={!canSubmit}>
        {busy ? "Téléversement..." : "Téléverser"}
      </Button>
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </form>
  );
}
