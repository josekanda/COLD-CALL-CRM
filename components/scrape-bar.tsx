"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { Search, Loader2, CircleAlert, Sparkles } from "lucide-react";
import { isBrowserLocal } from "@/lib/runtime-env";

// Le hostname ne change jamais en cours de session : abonnement no-op.
const noopSubscribe = () => () => {};

// Barre "Trouver des prospects" : lance le skill prospect-finder (scraping Apify
// + scoring) côté serveur LOCAL, puis injecte le CSV résultat dans le CRM via
// onImport (le même chemin que la dropzone). Visible en local uniquement : sur
// Vercel le token Apify n'est pas là, donc on garde la dropzone pour l'import.
export function ScrapeBar({
  onImport,
  onToast,
}: {
  onImport: (text: string) => number;
  onToast: (msg: string) => void;
}) {
  const isLocal = useSyncExternalStore(
    noopSubscribe,
    () => isBrowserLocal(window.location.hostname),
    () => false,
  );

  const [metier, setMetier] = useState("");
  const [ville, setVille] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  if (!isLocal) return null;

  const canLaunch = metier.trim() !== "" && ville.trim() !== "" && !running;

  const pushLog = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (lines.length) setLogs((prev) => [...prev, ...lines].slice(-200));
  };

  function handleSse(raw: string) {
    let event = "message";
    let dataStr = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
    }
    let data: Record<string, unknown> = {};
    try {
      data = dataStr ? JSON.parse(dataStr) : {};
    } catch {
      return;
    }

    if (event === "log" && typeof data.text === "string") {
      pushLog(data.text);
    } else if (event === "error") {
      setErrorMsg(typeof data.message === "string" ? data.message : "Erreur.");
      setRunning(false);
    } else if (event === "done") {
      const csv = typeof data.csv === "string" ? data.csv : "";
      if (csv.trim()) {
        const n = onImport(csv);
        onToast(`${n} prospect(s) trouvé(s) et ajouté(s)`);
      } else {
        const note =
          typeof data.note === "string"
            ? data.note
            : "Aucun prospect appelable trouvé pour cette recherche.";
        onToast(note);
      }
      setRunning(false);
    }
  }

  async function launch() {
    setRunning(true);
    setLogs([]);
    setErrorMsg("");

    // 1) Token de session local (le GET vérifie aussi localhost).
    let token = "";
    try {
      const res = await fetch("/api/scrape", { method: "GET" });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Scraping indisponible (non local).");
      }
      token = data.token;
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Token de session indisponible.",
      );
      setRunning(false);
      return;
    }

    // 2) POST + lecture du flux SSE (fetch streaming).
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scrape-token": token,
        },
        body: JSON.stringify({ metier: metier.trim(), ville: ville.trim() }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scraping refusé (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          handleSse(chunk);
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setErrorMsg(
        e instanceof Error ? e.message : "Erreur pendant le scraping.",
      );
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <span className="font-bold text-sm">Trouver des prospects</span>
        <span className="text-muted-foreground text-xs">
          — scrape les commerces sans site (Apify + scoring)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={metier}
          onChange={(e) => setMetier(e.target.value)}
          placeholder="Métier (ex : plombier)"
          disabled={running}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
        <input
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Ville (ex : Bayonne)"
          disabled={running}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canLaunch) launch();
          }}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
        <button
          onClick={launch}
          disabled={!canLaunch}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          {running ? "Recherche…" : "Trouver"}
        </button>
      </div>

      {running && (
        <p className="text-muted-foreground text-xs mt-2">
          Le scraping prend 1 à 3 min (run Apify + filtrage). Laisse la fenêtre
          ouverte.
        </p>
      )}

      {errorMsg && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <CircleAlert
            className="size-4 shrink-0 mt-0.5 text-destructive"
            aria-hidden
          />
          <span>{errorMsg}</span>
        </div>
      )}

      {(running || logs.length > 0) && (
        <details className="text-xs text-muted-foreground mt-2" open={running}>
          <summary className="cursor-pointer select-none">
            Détail du scraping ({logs.length})
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2 font-mono">
            {logs.join("\n") || "—"}
          </pre>
        </details>
      )}
    </div>
  );
}
