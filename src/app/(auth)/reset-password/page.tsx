"use client";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

type ViewState = "loading" | "ready" | "done" | "error";
type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change";

function parseHashParams(hash: string) {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(clean);
}

export default function ResetPasswordPage() {
  const [state, setState] = useState<ViewState>("loading");
  const [message, setMessage] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Configuration Supabase manquante.");
        }

        const client = createClient(supabaseUrl, supabaseAnonKey);
        supabaseRef.current = client;

        const url = new URL(window.location.href);
        const queryParams = url.searchParams;
        const hashParams = parseHashParams(window.location.hash);

        const getParam = (key: string) => queryParams.get(key) ?? hashParams.get(key);

        const error = getParam("error");
        const errorDescription = getParam("error_description");
        if (error) {
          throw new Error(decodeURIComponent(errorDescription ?? error));
        }

        const code = getParam("code");
        const accessToken = getParam("access_token");
        const refreshToken = getParam("refresh_token");
        const type = getParam("type");
        const tokenHash = getParam("token_hash") ?? getParam("token");

        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && type) {
          const allowedTypes = new Set<OtpType>(["signup", "invite", "magiclink", "recovery", "email_change"]);
          const otpType = allowedTypes.has(type as OtpType) ? (type as OtpType) : null;
          if (!otpType) {
            throw new Error("Type de lien non supporte.");
          }
          const { error } = await client.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
          if (error) throw error;
        } else {
          throw new Error("Lien de reinitialisation invalide ou incomplet.");
        }

        const { data, error: userError } = await client.auth.getUser();
        if (userError || !data.user) {
          throw userError ?? new Error("Session de reinitialisation invalide.");
        }

        if (!cancelled) {
          setState("ready");
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : "Erreur inconnue";
        if (!cancelled) {
          setMessage(text);
          setState("error");
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    if (!password || password.length < 8) {
      setMessage("Mot de passe trop court (minimum 8 caracteres).");
      setState("error");
      return;
    }
    if (password !== confirm) {
      setMessage("Les mots de passe ne correspondent pas.");
      setState("error");
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const supabase = supabaseRef.current;
      if (!supabase) {
        throw new Error("Session de reinitialisation manquante.");
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      setState("done");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Erreur inconnue";
      setMessage(text);
      setState("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Nouveau mot de passe</h1>
        <p className="text-sm text-white/85">Choisissez un nouveau mot de passe pour votre compte.</p>
      </div>

      {state === "error" ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {message || "Operation impossible. Reessayez."}
        </div>
      ) : null}

      {state === "done" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            Mot de passe mis a jour. Vous pouvez vous reconnecter.
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              window.location.href = "/login?password=1";
            }}
          >
            Aller a la connexion
          </Button>
        </div>
      ) : null}

      {state === "loading" ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">Chargement...</div>
      ) : null}

      {state === "ready" ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <PasswordInput
            name="password"
            required
            placeholder="Nouveau mot de passe (min 8)"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordInput
            name="password_confirm"
            required
            placeholder="Confirmer le mot de passe"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button type="submit" className="w-full" variant="secondary" disabled={pending}>
            {pending ? "En cours..." : "Mettre a jour le mot de passe"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
