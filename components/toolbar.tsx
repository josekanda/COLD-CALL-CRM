"use client";
import { Bell, BadgeEuro, Download, type LucideIcon } from "lucide-react";

export type Filter =
  | "all"
  | "a_appeler"
  | "rdv"
  | "qualifie"
  | "construit"
  | "refus"
  | "rappel"
  | "upsell";

const CHIPS: { f: Filter; label: string; icon?: LucideIcon }[] = [
  { f: "all", label: "Tous" },
  { f: "a_appeler", label: "À appeler" },
  { f: "rappel", label: "À rappeler aujourd'hui", icon: Bell },
  { f: "rdv", label: "RDV" },
  { f: "qualifie", label: "OUI · à construire" },
  { f: "construit", label: "Construits" },
  { f: "refus", label: "Pas intéressé" },
  { f: "upsell", label: "Upsell en cours", icon: BadgeEuro },
];

export function Toolbar({
  filter,
  onFilter,
  search,
  onSearch,
  cal,
  onCal,
  onExport,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
  search: string;
  onSearch: (s: string) => void;
  cal: string;
  onCal: (s: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.f}
            onClick={() => onFilter(c.f)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filter === c.f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            {c.icon && <c.icon className="size-3" aria-hidden />}
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher…"
          className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm w-56"
        />
        <input
          value={cal}
          onChange={(e) => onCal(e.target.value)}
          placeholder="Ton lien Calendly"
          className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm flex-1 min-w-56"
        />
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Download className="size-3.5" aria-hidden />
          Exporter
        </button>
      </div>
    </div>
  );
}
