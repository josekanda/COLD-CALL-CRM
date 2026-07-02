import type { Prospect } from "./types";

export function pid(entreprise: string, tel: string): string {
  return (entreprise + "|" + tel).toLowerCase();
}

// Parse RFC-4180 minimal : gère guillemets, virgules internes, "" échappé.
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[éè]/g, "e")
    .replace(/[^a-z]/g, "");

export function parseProspectsCsv(text: string): Prospect[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const header = parseLine(lines[0]).map(norm);
  const idx = (name: string) => header.indexOf(norm(name));
  const col = {
    entreprise: idx("Entreprise"),
    ville: idx("Ville"),
    activite: idx("Activité"),
    tel: idx("Téléphone"),
    note: idx("Note"),
    nbAvis: idx("NbAvis"),
    score: idx("Score"),
    pourquoi: idx("Pourquoi"),
    lienFiche: idx("LienFiche"),
    placeId: idx("PlaceId"),
  };

  const get = (cells: string[], i: number) => (i >= 0 ? (cells[i] ?? "") : "");
  return lines.slice(1).map((line) => {
    const c = parseLine(line);
    const entreprise = get(c, col.entreprise);
    const tel = get(c, col.tel);
    return {
      id: pid(entreprise, tel),
      entreprise,
      tel,
      ville: get(c, col.ville),
      activite: get(c, col.activite),
      note: get(c, col.note),
      nbAvis: get(c, col.nbAvis),
      score: get(c, col.score),
      pourquoi: get(c, col.pourquoi),
      lienFiche: get(c, col.lienFiche),
      status: "a_appeler" as const,
      notes: "",
      rappelLe: null,
      montant: null,
      siteUrl: "",
      placeId: get(c, col.placeId),
      upsell: "aucun" as const,
    };
  });
}
