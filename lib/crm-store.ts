// Store externe (localStorage) consommé via useSyncExternalStore.
// Évite le setState-in-effect proscrit par React 19 / Next 16.
import type { AppState, Prospect, Status } from "./types";
import {
  loadState,
  saveState,
  mergeProspects,
  autoRappelPatch,
  DEFAULT_CAL,
} from "./store";
import { todayIso } from "./dates";
import { parseProspectsCsv } from "./csv";
import { SEED_PROSPECTS } from "./seed";

const EMPTY: AppState = { prospects: [], cal: DEFAULT_CAL };

let snapshot: AppState | null = null; // null tant que pas hydraté côté client
const listeners = new Set<() => void>();

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSnapshot(): AppState {
  if (snapshot === null) snapshot = loadState(); // démarrage vierge (pas de seed auto)
  return snapshot;
}

export function getServerSnapshot(): AppState {
  return EMPTY;
}

function commit(next: AppState) {
  snapshot = next;
  saveState(next);
  for (const l of listeners) l();
}

export function importCsv(text: string): number {
  const incoming = parseProspectsCsv(text);
  const cur = getSnapshot();
  commit({ ...cur, prospects: mergeProspects(cur.prospects, incoming) });
  return incoming.length;
}

export function loadExample() {
  const cur = getSnapshot();
  commit({ ...cur, prospects: SEED_PROSPECTS });
}

export function updateProspect(id: string, patch: Partial<Prospect>) {
  const cur = getSnapshot();
  commit({
    ...cur,
    prospects: cur.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  });
}

export function setStatus(id: string, status: Status) {
  const p = getSnapshot().prospects.find((x) => x.id === id);
  updateProspect(id, p ? autoRappelPatch(p, status, todayIso()) : { status });
}

export function setCal(cal: string) {
  const cur = getSnapshot();
  commit({ ...cur, cal });
}

export function resetProspects() {
  const cur = getSnapshot();
  commit({ ...cur, prospects: [] });
}
