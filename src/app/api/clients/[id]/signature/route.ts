import { PDFDocument } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeDataUrl(dataUrl: string) {
  const idx = dataUrl.indexOf("base64,");
  if (idx === -1) return null;
  const base64 = dataUrl.slice(idx + "base64,".length);
  return Buffer.from(base64, "base64");
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("id,nom").eq("id", id).maybeSingle();
  if (!client?.id) return new Response("Not found", { status: 404 });

  const { data: sig } = await admin
    .from("client_signatures")
    .select("signature_data_url,created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dataUrl = (sig as { signature_data_url?: string } | null)?.signature_data_url ?? "";
  if (!dataUrl.startsWith("data:image/")) return new Response("No signature", { status: 404 });

  const bytes = decodeDataUrl(dataUrl);
  if (!bytes) return new Response("Invalid signature", { status: 400 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const png = await pdf.embedPng(bytes);

  const margin = 48;
  const maxWidth = page.getWidth() - margin * 2;
  const maxHeight = 220;
  const scale = Math.min(maxWidth / png.width, maxHeight / png.height);
  const width = png.width * scale;
  const height = png.height * scale;

  page.drawImage(png, {
    x: margin,
    y: page.getHeight() - margin - height,
    width,
    height,
  });

  const pdfBytes = await pdf.save();
  const fileName = `signature-${String(client.nom ?? "client")
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("/", "-")}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

