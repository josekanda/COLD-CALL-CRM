// Helpers PURS de la timeline de build (consommés par build-queue.tsx).
//
// Le lanceur émet du stream-json Claude + des logs lisibles. Côté client on veut
// une timeline simple : recherche fiche -> build -> QA visuel -> deploy -> URL live.
// Ces fonctions n'ont aucune dépendance React/DOM : testables en isolation.

export type Phase = "recherche" | "build" | "qa" | "deploy" | "live";

export const PHASE_LABELS: Record<Phase, string> = {
  recherche: "Recherche de la fiche",
  build: "Construction du site",
  qa: "QA visuel",
  deploy: "Déploiement",
  live: "URL live",
};

export const PHASE_ORDER: Phase[] = [
  "recherche",
  "build",
  "qa",
  "deploy",
  "live",
];

// Déduit la phase courante d'un texte d'activité (assistant ou log).
// Renvoie null si le texte n'indique aucune phase claire.
export function detectPhase(text: string): Phase | null {
  const t = text.toLowerCase();
  // "live" = une URL concrète ou un état "déployé/url live" — pas le simple
  // "en ligne" (ambigu avec l'action "mise en ligne" = phase deploy).
  if (/url live|déployé|deploye|https?:\/\/\S+\.vercel\.app/.test(t))
    return "live";
  if (/deploy|vercel|mise en ligne|en ligne|publication/.test(t))
    return "deploy";
  if (/qa_check|qa visuel|contrôle qualité|controle qualite|\bqa\b/.test(t))
    return "qa";
  if (/brief|recherche|fiche google|avis|infos? réelle|infos? reelle/.test(t))
    return "recherche";
  if (/build|section|composant|page|next|shadcn|code|écrit|ecrit/.test(t))
    return "build";
  return null;
}

// Rang d'une phase dans l'ordre canonique (recherche=0 … live=4).
export function phaseRank(p: Phase): number {
  return PHASE_ORDER.indexOf(p);
}

// Avance MONOTONE : déduit la phase du texte mais ne recule JAMAIS. Un log
// "construction" arrivant après un "déploiement" garde la phase à "deploy"
// (sinon la timeline régresse et donne l'illusion d'une boucle).
export function nextPhase(current: Phase | null, text: string): Phase | null {
  const detected = detectPhase(text);
  if (detected === null) return current;
  if (current === null) return detected;
  return phaseRank(detected) > phaseRank(current) ? detected : current;
}

// Extrait une URL Vercel (ou http(s) crédible) d'un texte, "" si aucune.
export function extractLiveUrl(text: string): string {
  const vercel = text.match(/https?:\/\/[^\s)"']+\.vercel\.app[^\s)"']*/i);
  if (vercel) return vercel[0];
  const any = text.match(/https?:\/\/[^\s)"']+/i);
  return any ? any[0] : "";
}

// Concatène le texte d'un event "assistant" stream-json (blocs de type "text").
export function assistantText(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const ev = parsed as {
    type?: string;
    message?: { content?: Array<{ type?: string; text?: string }> };
  };
  if (ev.type !== "assistant" || !Array.isArray(ev.message?.content)) return "";
  return ev.message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}
