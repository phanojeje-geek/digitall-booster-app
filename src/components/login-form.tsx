"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { signInAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";

type SignInActionType = typeof signInAction;

export function LoginForm({ action }: { action: SignInActionType }) {
  const [geo, setGeo] = useState<{ lat?: string; lng?: string; label?: string }>({});

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setGeo({
          lat,
          lng,
          label: `lat:${lat}, lng:${lng}`,
        });
      },
      () => {
        setGeo({});
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  }, []);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="geo_lat" value={geo.lat ?? ""} />
      <input type="hidden" name="geo_lng" value={geo.lng ?? ""} />
      <input type="hidden" name="geo_label" value={geo.label ?? ""} />
      <Input name="email" type="email" required placeholder="Email" />
      <PasswordInput name="password" required placeholder="Mot de passe" />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full gap-2" variant="secondary" disabled={pending}>
      {pending ? <Spinner /> : null}
      {pending ? "Connexion..." : "Se connecter"}
    </Button>
  );
}
