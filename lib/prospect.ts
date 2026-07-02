import type { Prospect } from "./types";

// Seuils de priorité alignés sur le score produit par prospect-finder.
export const SCORE_HI = 45;
export const SCORE_MID = 25;

export function cmdFor(p: Prospect): string {
  return (
    'Build le site de "' +
    p.entreprise +
    '" à ' +
    (p.ville || "[ville]") +
    ". Lead-to-site, mode premium, deploy Vercel direct. Fonce."
  );
}

export function scoreClass(score: string): "hi" | "mid" | "lo" {
  const n = parseFloat(score) || 0;
  return n >= SCORE_HI ? "hi" : n >= SCORE_MID ? "mid" : "lo";
}

export function telHref(tel: string): string {
  return "tel:" + (tel || "").replace(/[^0-9+]/g, "");
}

// Lien direct de dépôt d'avis Google (upsell relance d'avis).
export function avisUrl(placeId: string): string {
  return placeId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
    : "";
}

// "★ 4.7 (120 avis)" — wording unique réutilisé partout.
export function noteLabel(p: Prospect): string {
  if (!p.note) return "";
  return `★ ${p.note}${p.nbAvis ? ` (${p.nbAvis} avis)` : ""}`;
}

// SMS de livraison prêt à envoyer au client une fois le site construit.
export function messageClient(p: Prospect): string {
  const url = p.siteUrl || "[colle l'URL du site]";
  return (
    `Bonjour, comme promis voilà votre site : ${url}\n` +
    `Regardez-le depuis votre téléphone, c'est là que vos clients le verront.\n` +
    `Dites-moi ce que vous en pensez, je vous rappelle pour votre retour.`
  );
}
