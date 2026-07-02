import { describe, it, expect } from "vitest";
import { cmdFor, scoreClass, telHref, avisUrl } from "./prospect";
import type { Prospect } from "./types";

const p = (over: Partial<Prospect>): Prospect => ({
  id: "x",
  entreprise: "Debowski Paysage",
  ville: "Le Bouscat",
  activite: "",
  tel: "06 12 34 56 78",
  note: "",
  nbAvis: "",
  score: "47",
  pourquoi: "",
  lienFiche: "",
  status: "a_appeler",
  notes: "",
  rappelLe: null,
  montant: null,
  siteUrl: "",
  placeId: "",
  upsell: "aucun",
  ...over,
});

describe("cmdFor", () => {
  it("génère la commande lead-to-site exacte", () => {
    expect(cmdFor(p({}))).toBe(
      'Build le site de "Debowski Paysage" à Le Bouscat. Lead-to-site, mode premium, deploy Vercel direct. Fonce.',
    );
  });
  it("met [ville] si la ville manque", () => {
    expect(cmdFor(p({ ville: "" }))).toContain("à [ville].");
  });
});

describe("scoreClass", () => {
  it("classe hi/mid/lo", () => {
    expect(scoreClass("47")).toBe("hi");
    expect(scoreClass("30")).toBe("mid");
    expect(scoreClass("10")).toBe("lo");
  });
});

describe("avisUrl", () => {
  it("génère le lien de dépôt d'avis Google", () => {
    expect(avisUrl("ChIJ123abc")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJ123abc",
    );
  });
  it("retourne vide sans placeId", () => {
    expect(avisUrl("")).toBe("");
  });
});

describe("telHref", () => {
  it("nettoie le numéro", () => {
    expect(telHref("06 12 34 56 78")).toBe("tel:0612345678");
  });
});
