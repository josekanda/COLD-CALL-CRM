import type { Prospect } from "./types";
import { STATUSES } from "./types";

export function toCsv(prospects: Prospect[]): string {
  const head = [
    "Entreprise",
    "Ville",
    "Activité",
    "Téléphone",
    "Score",
    "Statut",
    "Rappel",
    "Montant",
    "Notes",
  ];
  const esc = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  const lines = [head.join(",")];
  for (const p of prospects) {
    lines.push(
      [
        p.entreprise,
        p.ville,
        p.activite,
        p.tel,
        p.score,
        STATUSES[p.status],
        p.rappelLe ?? "",
        p.montant ?? "",
        (p.notes || "").replace(/\n/g, " "),
      ]
        .map(esc)
        .join(","),
    );
  }
  return "﻿" + lines.join("\n");
}

export function downloadCsv(prospects: Prospect[]): void {
  const blob = new Blob([toCsv(prospects)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "crm_export.csv";
  a.click();
}
