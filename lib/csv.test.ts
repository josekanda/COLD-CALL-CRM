import { describe, it, expect } from "vitest";
import { parseProspectsCsv } from "./csv";

const SAMPLE = `Entreprise,Ville,Activité,Téléphone,Note,NbAvis,Score,Pourquoi
"Debowski Paysage",Le Bouscat,Paysagiste,06 12 34 56 78,5.0,6,47,"Sans site, 5.0/5"
Long Hai,Le Bouscat,Restaurant,06 68 20 40 52,4.7,120,30,Bonne note`;

describe("parseProspectsCsv", () => {
  it("parse les colonnes du format prospect-finder", () => {
    const rows = parseProspectsCsv(SAMPLE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      entreprise: "Debowski Paysage",
      ville: "Le Bouscat",
      activite: "Paysagiste",
      tel: "06 12 34 56 78",
      note: "5.0",
      nbAvis: "6",
      score: "47",
      pourquoi: "Sans site, 5.0/5",
    });
  });

  it("génère un id stable entreprise|tel en minuscules", () => {
    const rows = parseProspectsCsv(SAMPLE);
    expect(rows[0].id).toBe("debowski paysage|06 12 34 56 78");
  });

  it("initialise les champs CRM par défaut", () => {
    const rows = parseProspectsCsv(SAMPLE);
    expect(rows[0]).toMatchObject({
      status: "a_appeler",
      notes: "",
      rappelLe: null,
      montant: null,
    });
  });

  it("ignore une ligne vide finale et le BOM", () => {
    const rows = parseProspectsCsv("﻿" + SAMPLE + "\n");
    expect(rows).toHaveLength(2);
  });
});
