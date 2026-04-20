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

  // Load Logo
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const logoPath = path.join(process.cwd(), "public", "icons", "icon-512.png");
    const logoBytes = await fs.readFile(logoPath);
    const logoImage = await pdf.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.12);
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    // Add Agency Name next to logo
    page.drawText("DIGITALL BOOSTER", {
      x: margin + logoDims.width + 15,
      y: y - 25,
      size: 20,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.8),
    });
    page.drawText("Agence de Marketing Digital & Accompagnement", {
      x: margin + logoDims.width + 15,
      y: y - 40,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= logoDims.height + 20;
  } catch (e) {
    y -= 40;
  }

  // Horizontal Line
  page.drawLine({
    start: { x: margin, y: y + 10 },
    end: { x: page.getWidth() - margin, y: y + 10 },
    thickness: 1.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  const drawText = (text: string, size = 10, isBold = false, indent = 0) => {
    if (y < margin + 40) {
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
    y += 15;
    page.drawText(val, {
      x: margin + 140,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 15;
  };

  const drawSectionTitle = (title: string) => {
    y -= 10;
    // Section background
    page.drawRectangle({
      x: margin - 5,
      y: y - 5,
      width: page.getWidth() - (margin * 2) + 10,
      height: 20,
      color: rgb(0.95, 0.96, 1),
    });
    drawText(title, 11, true, 2);
    y -= 5;
  };

  // Title
  y -= 10;
  drawText("FICHE D'INSCRIPTION & CONTRAT DE SERVICE", 15, true, (page.getWidth() - margin * 2 - 300) / 2);
  drawText(`Ref: DB-${client.id.slice(0, 8).toUpperCase()}`, 8, false, (page.getWidth() - margin * 2 - 80) / 2);
  y -= 10;

  // Company Info
  drawSectionTitle("1. INFORMATIONS SUR L'ENTREPRISE");
  drawField("Nom Entreprise", intake.company?.name || client.entreprise);
  drawField("Secteur", intake.company?.sector || client.company_sector);
  drawField("Forme Juridique", intake.company?.legal_form || client.company_legal_form);
  drawField("Adresse / Ville", `${intake.company?.address || client.company_address || "N/A"}, ${intake.company?.city || client.company_city || "N/A"}`);
  
  // Contact Info
  drawSectionTitle("2. CONTACT PRINCIPAL");
  drawField("Nom & Prenoms", intake.contact?.name || client.nom);
  drawField("Fonction", intake.contact?.position);
  drawField("Telephone", intake.contact?.phone || client.telephone);
  drawField("Email", intake.contact?.email || client.email);
  
  // Subscription Info
  drawSectionTitle("3. OFFRE & ABONNEMENT");
  const subType = client.subscription_type || intake.subscription_plan;
  const price = subType === "6-mois" ? "5 000 FCFA" : subType === "12-mois" ? "10 000 FCFA" : "N/A";
  drawField("Plan choisi", subType?.replaceAll("-", " ").toUpperCase() || "N/A");
  drawField("Montant de l'offre", price);
  drawField("Duree engagement", subType === "6-mois" ? "6 Mois" : subType === "12-mois" ? "12 Mois" : "N/A");
  
  // Digital Presence
  drawSectionTitle("4. PRESENCE DIGITALE");
  drawField("Site Web / Facebook", intake.digital_presence?.website || intake.digital_presence?.facebook || "Non specifie");
  
  // Activity Description
  drawSectionTitle("5. DESCRIPTION DE L'ACTIVITE");
  const desc = intake.activity_description || "Description non fournie.";
  const descLines = desc.length > 80 ? [desc.slice(0, 80), desc.slice(80, 160)] : [desc];
  for (const line of descLines) {
    drawText(line, 9, false, 5);
  }
  y -= 10;

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

