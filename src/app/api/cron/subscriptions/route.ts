import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const url = new URL(request.url);
    const qs = url.searchParams.get("secret") ?? "";
    if (token !== secret && qs !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("clients")
    .select("id,nom,statut,intake_data")
    .eq("statut", "client")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  const now = Date.now();
  const alertDays = new Set([7, 3, 1, 0]);
  let processed = 0;
  let notified = 0;

  for (const raw of (rows ?? []) as Array<{ id: string; nom: string; statut: string; intake_data: unknown }>) {
    const intake = readRecord(raw.intake_data);
    const sub = readRecord(intake.subscription);
    const endsAt = (sub.ends_at as string | undefined) ?? null;
    if (!endsAt) continue;

    const endsMs = new Date(endsAt).getTime();
    if (!Number.isFinite(endsMs)) continue;

    const daysLeft = Math.max(0, Math.ceil((endsMs - now) / (24 * 60 * 60 * 1000)));
    if (!alertDays.has(daysLeft)) continue;

    const notifiedDays = Array.isArray(sub.notified_days)
      ? sub.notified_days.filter((n) => typeof n === "number")
      : [];
    if (notifiedDays.includes(daysLeft)) continue;

    const nextSub = { ...sub, notified_days: [...notifiedDays, daysLeft] };
    const nextIntake = { ...intake, subscription: nextSub };

    const { error: updateError } = await admin.from("clients").update({ intake_data: nextIntake }).eq("id", raw.id);
    if (updateError) continue;

    const message =
      daysLeft === 0 ? `Abonnement expiré: ${raw.nom}` : `Abonnement: ${raw.nom} arrive à échéance (J-${daysLeft})`;
    const { error: insertError } = await admin.from("notifications").insert({
      sender_id: null,
      scope: "role",
      target_role: "admin",
      target_user_id: null,
      owner_id: null,
      title: "Abonnement",
      message,
      read: false,
    });
    if (!insertError) notified += 1;
    processed += 1;
  }

  return Response.json({ ok: true, processed, notified });
}
