"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/signature-pad";
import { createClientAction } from "@/features/clients/actions";
import { compressImage } from "@/lib/image-compression";
import { Card } from "@/components/ui/card";

export function ClientRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Confirmer l'enregistrement de ce client ?")) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      
      // Compress identity documents
      const docFields = ["doc_cni_recto", "doc_cni_verso", "doc_passeport", "doc_autre"];
      for (const field of docFields) {
        const file = formData.get(field);
        if (file instanceof File && file.size > 0) {
          const compressed = await compressImage(file);
          formData.set(field, compressed);
        }
      }

      await createClientAction(formData);
    } catch (error: any) {
      // Next.js redirect() throws an error, we should not treat it as a failure
      if (error.message === "NEXT_REDIRECT") {
        return;
      }
      console.error("Submission error:", error);
      alert("Une erreur est survenue lors de l'enregistrement. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="statut" value="client" />
      
      <div className="md:col-span-3">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Informations sur l'entreprise</p>
      </div>
      <Input name="entreprise" placeholder="Nom de l'entreprise" required />
      <Input name="company_sector" placeholder="Secteur d'activité" />
      <Input name="company_legal_form" placeholder="Forme juridique" />
      <Input name="company_address" placeholder="Adresse" />
      <Input name="company_city" placeholder="Ville" />
      <Input name="company_country" placeholder="Pays" />

      <div className="md:col-span-3 pt-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Contact principal</p>
      </div>
      <Input name="nom" required placeholder="Nom & Prénoms" />
      <Input name="contact_position" placeholder="Fonction" />
      <Input name="telephone" placeholder="Téléphone" required />
      <Input name="contact_whatsapp" placeholder="WhatsApp" />
      <Input name="email" type="email" required placeholder="Email" />

      <div className="md:col-span-3 pt-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Présence digitale</p>
      </div>
      <Input name="facebook" placeholder="Page Facebook" />
      <Input name="instagram" placeholder="Compte Instagram" />
      <Input name="website" placeholder="Site Web" />
      <Input name="other_platforms" placeholder="Autres plateformes" className="md:col-span-3" />

      <div className="md:col-span-3 pt-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Objectifs de l'entreprise</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {["Augmenter la visibilité", "Attirer plus de clients", "Améliorer l'image de marque", "Booster les ventes"].map((obj) => (
            <label key={obj} className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600 transition-colors">
              <input type="checkbox" name="objectives" value={obj} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
              {obj}
            </label>
          ))}
        </div>
        <input
          name="objectives_other"
          placeholder="Autres objectifs..."
          className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>

      <div className="md:col-span-3 pt-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Choix de l'abonnement</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
            <input type="radio" name="subscription_plan" value="6_mois_3000_fcfa" required className="text-indigo-600 focus:ring-indigo-600" />
            Formule 6 mois - 3000 FCFA
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
            <input type="radio" name="subscription_plan" value="12_mois_5000_fcfa" required className="text-indigo-600 focus:ring-indigo-600" />
            Formule 12 mois - 5000 FCFA
          </label>
        </div>
      </div>

      <div className="md:col-span-3 pt-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Description de l'activité</p>
        <textarea
          name="activity_description"
          rows={3}
          placeholder="Décrivez brièvement l'activité du client..."
          className="mt-2 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>

      <div className="md:col-span-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="text-sm font-semibold mb-1">Documents d'identité</p>
        <p className="text-[10px] text-zinc-500 mb-3 uppercase font-medium">Prenez une photo nette des documents (CNI, Passeport)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "CNI Recto", name: "doc_cni_recto" },
            { label: "CNI Verso", name: "doc_cni_verso" },
            { label: "Passeport", name: "doc_passeport" },
            { label: "Autre Document", name: "doc_autre" },
          ].map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{field.label}</label>
              <input 
                type="file" 
                name={field.name} 
                accept="image/*" 
                capture="environment" 
                className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="text-sm font-semibold mb-3">Signature du client</p>
        <div className="bg-zinc-50 rounded-xl p-1 dark:bg-zinc-900/50">
          <SignaturePad />
        </div>
      </div>

      <div className="md:col-span-3 pt-6">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto px-12 py-7 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Traitement et compression...
            </span>
          ) : (
            "Finaliser l'enregistrement"
          )}
        </Button>
      </div>
    </form>
  );
}
