"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Hammer,
  Copy,
  Check,
  Play,
  X,
  Loader2,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import type { Prospect } from "@/lib/types";
import { cmdFor } from "@/lib/prospect";
import { copyToClipboard } from "@/lib/clipboard";
import { isBrowserLocal } from "@/lib/runtime-env";
import {
  type Phase,
  PHASE_LABELS,
  PHASE_ORDER,
  detectPhase,
  nextPhase,
  extractLiveUrl,
  assistantText,
} from "@/lib/build-timeline";

// Le hostname ne change jamais en cours de session : abonnement no-op.
const noopSubscribe = () => () => {};

export function BuildQueue({
  prospects,
  onBuilt,
  onToast,
}: {
  prospects: Prospect[];
  onBuilt: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  // Le bouton "Lancer le build" n'a de sens qu'en local (auth claude + vercel
  // sur la machine de l'élève). Sur Vercel : fallback copie de la commande.
  // useSyncExternalStore (comme use-crm) : false côté serveur, vrai hostname
  // côté client, sans mismatch d'hydratation ni setState dans un effet.
  const isLocal = useSyncExternalStore(
    noopSubscribe,
    () => isBrowserLocal(window.location.hostname),
    () => false,
  );

  const [active, setActive] = useState<Prospect | null>(null);

  const queue = prospects.filter((p) => p.status === "qualifie");
  if (queue.length === 0) return null;

  const copy = (text: string, msg: string) =>
    copyToClipboard(text).then((ok) => ok && onToast(msg));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold inline-flex items-center gap-2">
          <Hammer className="size-4 text-primary" aria-hidden />
          File de build{" "}
          <span className="text-muted-foreground font-normal text-xs">
            — les prospects qui ont dit OUI
          </span>
        </h2>
        <button
          onClick={() =>
            copy(
              queue.map(cmdFor).join("\n"),
              `${queue.length} commande(s) copiée(s)`,
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
        >
          <Copy className="size-3" aria-hidden />
          Copier toutes les commandes
        </button>
      </div>
      <div className="space-y-2">
        {queue.map((p) => {
          const cmd = cmdFor(p);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-semibold">{p.entreprise}</span>{" "}
                <span className="text-muted-foreground text-xs">
                  · {p.ville}
                </span>
                <div className="text-muted-foreground text-xs truncate">
                  {cmd}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {isLocal && (
                  <button
                    onClick={() => setActive(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-2 py-1 text-xs font-semibold"
                  >
                    <Play className="size-3" aria-hidden />
                    Lancer le build
                  </button>
                )}
                <button
                  onClick={() =>
                    copy(cmd, "Commande copiée — colle dans Claude Code")
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                >
                  <Copy className="size-3" aria-hidden />
                  Copier
                </button>
                <button
                  onClick={() => onBuilt(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                >
                  <Check className="size-3" aria-hidden />
                  Construit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <BuildRunner
          prospect={active}
          onClose={() => setActive(null)}
          onBuilt={onBuilt}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// --- Modale de build : confirmation quota + preflight + timeline live -------

type RunState = "confirm" | "running" | "done" | "error";

function BuildRunner({
  prospect,
  onClose,
  onBuilt,
  onToast,
}: {
  prospect: Prospect;
  onClose: () => void;
  onBuilt: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  const [state, setState] = useState<RunState>("confirm");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveUrl, setLiveUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const reachedRef = useRef<Set<Phase>>(new Set());

  // Abandon : on coupe la connexion (la route tue le child à la fermeture).
  useEffect(() => {
    const ctrl = abortRef;
    return () => ctrl.current?.abort();
  }, []);

  const pushLog = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (lines.length) setLogs((prev) => [...prev, ...lines].slice(-200));
  };

  const advancePhase = (text: string) => {
    const p = detectPhase(text);
    if (p) {
      reachedRef.current.add(p);
      setPhase((cur) => nextPhase(cur, text)); // monotone : ne recule jamais
    }
    if (p === "live" || /\.vercel\.app/.test(text)) {
      const url = extractLiveUrl(text);
      if (url) setLiveUrl(url);
    }
  };

  async function launch() {
    setState("running");
    setLogs([]);
    setPhase(null);
    reachedRef.current = new Set();

    // 1) Récupère le token de session local (le GET vérifie aussi localhost).
    let token = "";
    try {
      const res = await fetch("/api/build", { method: "GET" });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Build indisponible (non local).");
      }
      token = data.token;
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Token de session indisponible.",
      );
      setState("error");
      return;
    }

    // 2) POST + lecture du flux SSE (fetch streaming : EventSource ne gère pas
    // le POST avec token + body).
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-build-token": token },
        body: JSON.stringify({
          id: prospect.id,
          entreprise: prospect.entreprise,
          ville: prospect.ville,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Build refusé (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Découpe les évènements SSE (séparés par double saut de ligne).
        let sep: number;
        while ((sep = buf.indexOf("\n\n")) >= 0) {
          const raw = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          handleSse(raw);
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) return; // abandon volontaire : pas une erreur
      setErrorMsg(e instanceof Error ? e.message : "Erreur pendant le build.");
      setState("error");
    }
  }

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
      advancePhase(data.text);
    } else if (event === "stream" && typeof data.line === "string") {
      try {
        const parsed = JSON.parse(data.line);
        const txt = assistantText(parsed);
        if (txt) advancePhase(txt);
      } catch {
        /* ligne partielle/non-JSON : ignorée pour la timeline */
      }
    } else if (event === "error") {
      setErrorMsg(typeof data.message === "string" ? data.message : "Erreur.");
      setState("error");
    } else if (event === "done") {
      if (data.code === 0) {
        reachedRef.current.add("live");
        setPhase("live");
        setState("done");
        onBuilt(prospect.id);
        onToast("Build terminé");
      } else {
        setErrorMsg(`Le build s'est arrêté (code ${data.code}).`);
        setState("error");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-5">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-lg">
            Build — {prospect.entreprise}
            <span className="text-muted-foreground font-normal text-sm">
              {" "}
              · {prospect.ville}
            </span>
          </div>
          <button
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            className="text-muted-foreground"
            aria-label="Fermer"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {state === "confirm" && (
          <div className="mt-3 space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-secondary text-secondary-foreground px-3 py-2.5 text-sm">
              <CircleAlert className="size-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                Ce build lance un vrai run en local et consomme ton quota
                Claude. Vérifie que tu es bien connecté (claude login) et que
                Vercel est relié (vercel whoami) — le preflight le contrôle
                avant de démarrer.
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Le lanceur fait un preflight (binaire claude, authentification,
              Vercel) puis déroule le build de bout en bout. Tu peux fermer
              cette fenêtre à tout moment pour l&apos;arrêter.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={launch}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
              >
                <Play className="size-4" aria-hidden />
                Lancer (consomme du quota)
              </button>
            </div>
          </div>
        )}

        {(state === "running" || state === "done" || state === "error") && (
          <div className="mt-4 space-y-4">
            <Timeline
              phase={phase}
              reached={reachedRef.current}
              state={state}
            />

            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
              >
                <ExternalLink className="size-4" aria-hidden />
                Ouvrir le site live
              </a>
            )}

            {state === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm">
                <CircleAlert
                  className="size-4 shrink-0 mt-0.5 text-destructive"
                  aria-hidden
                />
                <span>{errorMsg}</span>
              </div>
            )}

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">
                Détail technique ({logs.length})
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-2 font-mono">
                {logs.join("\n") || "—"}
              </pre>
            </details>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  onClose();
                }}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
              >
                {state === "running" ? "Arrêter et fermer" : "Fermer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Timeline({
  phase,
  reached,
  state,
}: {
  phase: Phase | null;
  reached: Set<Phase>;
  state: RunState;
}) {
  const currentIdx = phase ? PHASE_ORDER.indexOf(phase) : -1;
  return (
    <ol className="space-y-2">
      {PHASE_ORDER.map((p, i) => {
        const isDone =
          reached.has(p) &&
          (i < currentIdx || (state === "done" && p === "live"));
        const isCurrent = state === "running" && i === currentIdx;
        return (
          <li key={p} className="flex items-center gap-2.5 text-sm">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-card">
              {isDone ? (
                <Check className="size-3 text-primary" aria-hidden />
              ) : isCurrent ? (
                <Loader2
                  className="size-3 animate-spin text-primary"
                  aria-hidden
                />
              ) : (
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </span>
            <span
              className={
                isCurrent
                  ? "font-semibold"
                  : isDone
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
            >
              {PHASE_LABELS[p]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
