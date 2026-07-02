import type { AppState, Prospect, Status } from "./types";
import { addDaysIso } from "./dates";

export const STORAGE_KEY = "aura_crm_v1";
export const DEFAULT_CAL = "";

export function mergeProspects(
  existing: Prospect[],
  incoming: Prospect[],
): Prospect[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const p of incoming) {
    const prev = byId.get(p.id);
    // On garde les colonnes fraîches du CSV mais on préserve l'état CRM existant.
    byId.set(
      p.id,
      prev
        ? {
            ...p,
            status: prev.status,
            notes: prev.notes,
            rappelLe: prev.rappelLe,
            montant: prev.montant,
            siteUrl: prev.siteUrl,
            placeId: prev.placeId,
            upsell: prev.upsell,
          }
        : p,
    );
  }
  return [...byId.values()];
}

// Au passage en "Site construit", pose automatiquement le rappel de la preuve à J+30.
export function autoRappelPatch(
  p: Prospect,
  status: Status,
  todayIso: string,
): Partial<Prospect> {
  if (status === "construit" && !p.rappelLe)
    return { status, rappelLe: addDaysIso(todayIso, 30) };
  return { status };
}

export function counts(prospects: Prospect[]) {
  const c = {
    all: prospects.length,
    a_appeler: 0,
    rdv: 0,
    qualifie: 0,
    construit: 0,
    refus: 0,
  } as Record<string, number>;
  for (const p of prospects) c[p.status]++;
  return c as { all: number } & Record<Status, number>;
}

export function caDuMois(prospects: Prospect[]): number {
  return prospects.reduce((sum, p) => sum + (p.montant ?? 0), 0);
}

export function rappelsAujourdhui(
  prospects: Prospect[],
  todayIso: string,
): Prospect[] {
  return prospects.filter((p) => p.rappelLe !== null && p.rappelLe <= todayIso);
}

export function loadState(): AppState {
  if (typeof window === "undefined") return { prospects: [], cal: DEFAULT_CAL };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { prospects: [], cal: DEFAULT_CAL };
    const parsed = JSON.parse(raw) as AppState;
    return {
      prospects: parsed.prospects ?? [],
      cal: parsed.cal || DEFAULT_CAL,
    };
  } catch {
    return { prospects: [], cal: DEFAULT_CAL };
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
