"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; nom: string };

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

      const path = `${user.id}/${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("client-files").upload(path, file, {
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
        file_name: file.name,
        mime_type: file.type,
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
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <select
        name="client_id"
        required
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">Selectionner un client</option>
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
        className="h-10 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
      />
      <Button type="submit" disabled={!canSubmit}>
        {busy ? "Upload..." : "Upload"}
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
        const path = `${user.id}/${clientId}/${item.docType}-${Date.now()}-${item.file.name}`;
        const { error: uploadError } = await supabase.storage.from("client-documents").upload(path, item.file, {
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
          file_name: item.file.name,
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
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="file"
            required
            accept="image/*"
            capture="environment"
            onChange={(e) => setRecto(e.target.files?.[0] ?? null)}
            className="h-10 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
          />
          <input
            type="file"
            required
            accept="image/*"
            capture="environment"
            onChange={(e) => setVerso(e.target.files?.[0] ?? null)}
            className="h-10 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
      ) : (
        <input
          type="file"
          required
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => setSingle(e.target.files?.[0] ?? null)}
          className="h-10 rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-700"
        />
      )}

      <Button type="submit" disabled={!canSubmit}>
        {busy ? "Upload..." : "Uploader"}
      </Button>
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </form>
  );
}

