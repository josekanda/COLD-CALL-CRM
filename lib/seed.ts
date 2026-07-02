import type { Prospect } from "./types";
import { pid } from "./csv";

// Données 100% FICTIVES (noms génériques + numéros en plage non attribuée 01 99 00).
// Servent uniquement de démo "à quoi ça ressemble", à la demande de l'utilisateur.
const mk = (
  entreprise: string,
  ville: string,
  activite: string,
  tel: string,
  note: string,
  nbAvis: string,
  score: string,
  pourquoi: string,
): Prospect => ({
  id: pid(entreprise, tel),
  entreprise,
  ville,
  activite,
  tel,
  note,
  nbAvis,
  score,
  pourquoi,
  lienFiche: "",
  status: "a_appeler",
  notes: "",
  rappelLe: null,
  montant: null,
  siteUrl: "",
  placeId: "",
  upsell: "aucun",
});

export const SEED_PROSPECTS: Prospect[] = [
  mk(
    "Plomberie Démo",
    "Villeville",
    "Plombier",
    "01 99 00 00 01",
    "4.6",
    "38",
    "44",
    "Exemple — dépannage, lien Google casse (site mort)",
  ),
  mk(
    "Jardin Démo",
    "Villeville",
    "Paysagiste",
    "01 99 00 00 02",
    "4.9",
    "21",
    "47",
    "Exemple — sans site, gros ticket, photos de chantiers",
  ),
  mk(
    "Resto Démo",
    "Villeville",
    "Restaurant",
    "01 99 00 00 03",
    "4.4",
    "112",
    "30",
    "Exemple — sans site, commerce de flux, beaucoup d'avis",
  ),
];
