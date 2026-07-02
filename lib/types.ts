export type Status = "a_appeler" | "rdv" | "qualifie" | "construit" | "refus";

export const STATUSES: Record<Status, string> = {
  a_appeler: "À appeler",
  rdv: "RDV réservé",
  qualifie: "OUI · à construire",
  construit: "Site construit",
  refus: "Pas intéressé",
};

export type Upsell = "aucun" | "graine" | "propose" | "signe";

export const UPSELLS: Record<Upsell, string> = {
  aucun: "—",
  graine: "Graine plantée",
  propose: "Proposé",
  signe: "Signé",
};

export interface Prospect {
  id: string;
  entreprise: string;
  ville: string;
  activite: string;
  tel: string;
  note: string;
  nbAvis: string;
  score: string;
  pourquoi: string;
  lienFiche: string; // URL fiche Google (colonne LienFiche), "" si absente
  status: Status;
  notes: string;
  rappelLe: string | null; // ISO date "YYYY-MM-DD" ou null
  montant: number | null; // € encaissés
  siteUrl: string; // URL du site construit (lead-to-site), "" tant que pas construit
  placeId: string; // Google place_id (lien de dépôt d'avis), "" si inconnu
  upsell: Upsell; // pipeline post-vente
}

export interface AppState {
  prospects: Prospect[];
  cal: string;
}
