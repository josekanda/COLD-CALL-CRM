"use client";
import { useMemo, useState } from "react";
import { Phone, RotateCcw } from "lucide-react";
import { useCrm } from "@/hooks/use-crm";
import { Hero } from "@/components/hero";
import { KpiBar } from "@/components/kpi-bar";
import { ImportDropzone } from "@/components/import-dropzone";
import { ScrapeBar } from "@/components/scrape-bar";
import { BuildQueue } from "@/components/build-queue";
import { Toolbar, type Filter } from "@/components/toolbar";
import { ProspectTable } from "@/components/prospect-table";
import { ScriptPanel } from "@/components/script-panel";
import { CallMode } from "@/components/call-mode";
import { Toast } from "@/components/toast";
import { downloadCsv } from "@/lib/export";
import { rappelsAujourdhui } from "@/lib/store";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Page() {
  const {
    state,
    importCsv,
    loadExample,
    update,
    setStatus,
    setCal,
    reset,
    remove,
  } = useCrm();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [callMode, setCallMode] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1800);
  };

  const isEmpty = state.prospects.length === 0;

  // Tri permanent : meilleur score en premier, partout (table ET "Appeler le prochain").
  const sorted = useMemo(
    () =>
      [...state.prospects].sort(
        (a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0),
      ),
    [state.prospects],
  );
  const aAppeler = sorted.filter((p) => p.status === "a_appeler");
  const prochain = aAppeler[0] ?? null;

  const visible = useMemo(() => {
    let list = sorted;
    if (filter === "upsell")
      list = list.filter(
        (p) => p.upsell === "graine" || p.upsell === "propose",
      );
    else if (filter === "rappel") list = rappelsAujourdhui(list, todayIso());
    else if (filter !== "all") list = list.filter((p) => p.status === filter);
    const t = search.toLowerCase();
    if (t)
      list = list.filter((p) =>
        `${p.entreprise} ${p.ville} ${p.activite}`.toLowerCase().includes(t),
      );
    return list;
  }, [sorted, filter, search]);

  return (
    <main className="max-w-6xl mx-auto px-5 py-6 pb-24 w-full">
      <Hero count={state.prospects.length} />
      <KpiBar prospects={state.prospects} />

      {aAppeler.length > 0 && (
        <button
          onClick={() => setCallMode(true)}
          className="w-full mb-5 rounded-2xl aura-hero text-white py-4 font-bold text-lg shadow-lg"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Phone className="size-5" aria-hidden />
            Appeler le prochain ({aAppeler.length} en attente)
          </span>
        </button>
      )}

      <div className="mb-5">
        <ScrapeBar onImport={importCsv} onToast={showToast} />
        <ImportDropzone
          onImport={(text) => {
            const n = importCsv(text);
            showToast(`${n} prospect(s) importé(s)`);
            return n;
          }}
        />
        {isEmpty && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Première fois ?{" "}
            <button
              onClick={loadExample}
              className="text-primary font-semibold underline"
            >
              Voir un exemple
            </button>{" "}
            (données fictives — efface-les quand tu importes ta vraie liste).
          </div>
        )}
      </div>

      <BuildQueue
        prospects={state.prospects}
        onBuilt={(id) => setStatus(id, "construit")}
        onToast={showToast}
      />

      {!isEmpty && (
        <Toolbar
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          cal={state.cal}
          onCal={setCal}
          onExport={() => downloadCsv(state.prospects)}
        />
      )}

      {!isEmpty && (
        <ProspectTable
          prospects={visible}
          cal={state.cal}
          onUpdate={update}
          onStatus={setStatus}
          onToast={showToast}
          filter={filter}
          onFilter={setFilter}
          onRemove={remove}
        />
      )}

      {!isEmpty && (
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              if (confirm("Vider tous les prospects ?")) reset();
            }}
            className="text-muted-foreground text-xs underline"
          >
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="size-3" aria-hidden />
              Réinitialiser
            </span>
          </button>
        </div>
      )}

      <ScriptPanel current={prochain} />

      {callMode && (
        <CallMode
          queue={aAppeler}
          restants={aAppeler.length}
          onStatus={setStatus}
          onClose={() => setCallMode(false)}
          onToast={showToast}
          onRemove={remove}
        />
      )}

      <Toast msg={toast} />
    </main>
  );
}
