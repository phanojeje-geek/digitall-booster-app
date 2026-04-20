import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  const { data: client } = await admin.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client?.id) return new Response("Not found", { status: 404 });

  const intake = (client as any).intake_data || {};

  const { data: sig } = await admin
    .from("client_signatures")
    .select("signature_data_url,created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]); // A4
  
  const margin = 50;
  let y = page.getHeight() - margin;

  const drawText = (text: string, size = 10, isBold = false, indent = 0) => {
    if (y < margin + 20) {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    page.drawText(text, {
      x: margin + indent,
      y,
      size,
      font: isBold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 5;
  };

  const drawField = (label: string, value: any) => {
    const val = (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) 
      ? "Neant" 
      : String(value);
    
    drawText(`${label}: `, 10, true);
    y += 15; // move back up to draw value on same line
    page.drawText(val, {
      x: margin + 120,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 15;
  };

  // Header
  drawText("FICHE D'ENREGISTREMENT CLIENT", 18, true);
  drawText(`Digital Booster - Dashboard Agency`, 10, false);
  drawText(`Genere le: ${new Date().toLocaleString("fr-FR")}`, 8, false);
  y -= 20;

  // Company Info
  drawText("INFORMATIONS SUR L'ENTREPRISE", 12, true);
  y -= 5;
  drawField("Nom Entreprise", intake.company?.name || client.entreprise);
  drawField("Secteur", intake.company?.sector);
  drawField("Forme Juridique", intake.company?.legal_form);
  drawField("Adresse", intake.company?.address);
  drawField("Ville", intake.company?.city);
  drawField("Pays", intake.company?.country);
  y -= 15;

  // Contact Info
  drawText("CONTACT PRINCIPAL", 12, true);
  y -= 5;
  drawField("Nom & Prenoms", intake.contact?.name || client.nom);
  drawField("Fonction", intake.contact?.position);
  drawField("Telephone", intake.contact?.phone || client.telephone);
  drawField("WhatsApp", intake.contact?.whatsapp);
  drawField("Email", intake.contact?.email || client.email);
  y -= 15;

  // Digital Presence
  drawText("PRESENCE DIGITALE", 12, true);
  y -= 5;
  drawField("Facebook", intake.digital_presence?.facebook);
  drawField("Instagram", intake.digital_presence?.instagram);
  drawField("Site Web", intake.digital_presence?.website);
  drawField("Autres", intake.digital_presence?.other_platforms);
  y -= 15;

  // Objectives
  drawText("OBJECTIFS & ABONNEMENT", 12, true);
  y -= 5;
  drawField("Objectifs", Array.isArray(intake.objectives) ? intake.objectives.join(", ") : null);
  drawField("Autres Objectifs", intake.objectives_other);
  drawField("Plan choisi", intake.subscription_plan?.replaceAll("_", " "));
  y -= 15;

  // Activity Description
  drawText("DESCRIPTION DE L'ACTIVITE", 12, true);
  y -= 5;
  const desc = intake.activity_description || "Neant";
  const descLines = desc.split("\n");
  for (const line of descLines) {
    drawText(line, 9, false, 10);
  }
  y -= 20;

  // Signature
  drawText("SIGNATURE DU CLIENT", 12, true);
  y -= 10;
  
  if (sig?.signature_data_url) {
    if (sig.signature_data_url === "CONSENT_CHECKED") {
      drawText("ACCORD ECRIT DONNE PAR LE CLIENT (Case cochee sur le formulaire)", 10, true, 10);
    } else {
      const bytes = decodeDataUrl(sig.signature_data_url);
      if (bytes) {
        try {
          const png = await pdf.embedPng(bytes);
          const sigWidth = 200;
          const sigHeight = (sigWidth / png.width) * png.height;
          
          if (y < margin + sigHeight) {
            page = pdf.addPage([595.28, 841.89]);
            y = page.getHeight() - margin;
          }

          page.drawImage(png, {
            x: margin + 10,
            y: y - sigHeight,
            width: sigWidth,
            height: sigHeight,
          });
          y -= sigHeight + 10;
        } catch (e) {
          drawText("[Erreur affichage signature]", 10, false, 10);
        }
      }
    }
    drawText(`Date de signature: ${new Date(sig.created_at).toLocaleString("fr-FR")}`, 8, false, 10);
  } else {
    drawText("Neant (Aucune signature enregistree)", 10, false, 10);
  }

  const pdfBytes = await pdf.save();
  const fileName = `fiche-${String(client.nom ?? "client")
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

