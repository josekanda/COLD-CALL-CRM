import { describe, it, expect } from "vitest";
import {
  mergeProspects,
  counts,
  caDuMois,
  rappelsAujourdhui,
  autoRappelPatch,
} from "./store";
import type { Prospect } from "./types";

const make = (over: Partial<Prospect>): Prospect => ({
  id: "x",
  entreprise: "X",
  ville: "",
  activite: "",
  tel: "",
  note: "",
  nbAvis: "",
  score: "",
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

describe("mergeProspects", () => {
  it("préserve status/notes/montant/rappel des prospects existants", () => {
    const existing = [
      make({ id: "a|1", status: "construit", notes: "payé", montant: 1500 }),
    ];
    const incoming = [make({ id: "a|1" }), make({ id: "b|2" })];
    const merged = mergeProspects(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === "a|1")).toMatchObject({
      status: "construit",
      notes: "payé",
      montant: 1500,
    });
    expect(merged.find((p) => p.id === "b|2")?.status).toBe("a_appeler");
  });
});

describe("mergeProspects — nouveaux champs", () => {
  it("préserve placeId et upsell des prospects existants", () => {
    const existing = [make({ id: "a|1", placeId: "ChIJxx", upsell: "graine" })];
    const merged = mergeProspects(existing, [make({ id: "a|1" })]);
    expect(merged[0]).toMatchObject({ placeId: "ChIJxx", upsell: "graine" });
  });
});

describe("autoRappelPatch", () => {
  it("pose un rappel à J+30 quand on passe construit sans rappel", () => {
    expect(
      autoRappelPatch(make({ rappelLe: null }), "construit", "2026-06-10"),
    ).toEqual({
      status: "construit",
      rappelLe: "2026-07-10",
    });
  });
  it("ne touche pas un rappel déjà posé", () => {
    expect(
      autoRappelPatch(
        make({ rappelLe: "2026-06-20" }),
        "construit",
        "2026-06-10",
      ),
    ).toEqual({
      status: "construit",
    });
  });
  it("ne pose rien pour les autres statuts", () => {
    expect(
      autoRappelPatch(make({ rappelLe: null }), "rdv", "2026-06-10"),
    ).toEqual({ status: "rdv" });
  });
});

describe("counts", () => {
  it("compte par statut + total", () => {
    const c = counts([
      make({ status: "a_appeler" }),
      make({ status: "qualifie" }),
      make({ status: "qualifie" }),
    ]);
    expect(c).toMatchObject({
      all: 3,
      a_appeler: 1,
      qualifie: 2,
      rdv: 0,
      construit: 0,
      refus: 0,
    });
  });
});

describe("caDuMois", () => {
  it("somme tous les montants non nuls", () => {
    const total = caDuMois([
      make({ montant: 1500 }),
      make({ montant: 800 }),
      make({ montant: null }),
    ]);
    expect(total).toBe(2300);
  });
});

describe("rappelsAujourdhui", () => {
  it("retourne les prospects à rappeler à une date <= aujourd'hui", () => {
    const r = rappelsAujourdhui(
      [
        make({ id: "1", rappelLe: "2026-06-07" }),
        make({ id: "2", rappelLe: "2026-12-31" }),
        make({ id: "3", rappelLe: null }),
      ],
      "2026-06-07",
    );
    expect(r.map((p) => p.id)).toEqual(["1"]);
  });
});
