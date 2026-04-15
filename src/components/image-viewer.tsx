"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { isDemoMode } from "@/lib/runtime";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const signedUrlInFlight = new Map<string, Promise<string>>();

export function ImageViewer({
  src,
  bucket,
  path,
  expiresIn = 60 * 60,
  alt,
  className,
  width = 520,
  height = 320,
}: {
  src?: string;
  bucket?: string;
  path?: string;
  expiresIn?: number;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [open, setOpen] = useState(false);
  const cacheKey = bucket && path ? `${bucket}:${path}` : null;
  const [resolvedSrc, setResolvedSrc] = useState(src ?? "");
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const canOpen = Boolean(resolvedSrc);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (src) {
      setResolvedSrc(src);
      return;
    }
    if (isDemoMode) return;
    if (!cacheKey || !bucket || !path) return;

    const cached = signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setResolvedSrc(cached.url);
      return;
    }

    const existing = signedUrlInFlight.get(cacheKey);
    if (existing) {
      setLoading(true);
      void existing
        .then((url) => setResolvedSrc(url))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const promise = supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
      .then(({ data }) => data?.signedUrl ?? "")
      .catch(() => "");

    signedUrlInFlight.set(cacheKey, promise);
    void promise
      .then((url) => {
        if (url) {
          signedUrlCache.set(cacheKey, { url, expiresAt: Date.now() + Math.max(5_000, (expiresIn - 30) * 1000) });
        }
        setResolvedSrc(url);
      })
      .finally(() => {
        signedUrlInFlight.delete(cacheKey);
        setLoading(false);
      });
  }, [bucket, cacheKey, expiresIn, path, src]);

  const filename = useMemo(() => {
    try {
      const url = new URL(resolvedSrc);
      const path = url.pathname.split("/").filter(Boolean);
      return path[path.length - 1] ?? "image";
    } catch {
      return "image";
    }
  }, [resolvedSrc]);

  return (
    <>
      <button
        type="button"
        disabled={!canOpen || loading}
        onClick={() => setOpen(true)}
        className={className}
      >
        {resolvedSrc ? (
          <Image src={resolvedSrc} alt={alt} width={width} height={height} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500">
            {loading ? "Chargement..." : "Aperçu indisponible"}
          </div>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
              <p className="truncate text-sm font-medium">{filename}</p>
              <div className="flex items-center gap-2">
                <a
                  href={resolvedSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white active:scale-[0.98]"
                >
                  Ouvrir
                </a>
                <button
                  type="button"
                  onClick={close}
                  className="grid h-9 w-9 place-content-center rounded-lg bg-white/10 text-white active:scale-[0.98]"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-[78vh] w-full bg-black/20 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedSrc}
                alt={alt}
                className="mx-auto max-h-[74vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
