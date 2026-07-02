"use client";
import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  importCsv,
  loadExample,
  updateProspect,
  setStatus,
  setCal,
  resetProspects,
} from "@/lib/crm-store";

export function useCrm() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    state,
    importCsv,
    loadExample,
    update: updateProspect,
    setStatus,
    setCal,
    reset: resetProspects,
  };
}
