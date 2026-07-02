// app/api/build/route.ts — Route LOCALE qui pilote le lanceur de build.
//
// Garde-fous (cumulatifs) :
//   - REFUSE si l'app tourne sur Vercel (VERCEL=1) : le build n'a de sens qu'en local.
//   - REFUSE si Host ET Origin ne sont pas localhost.
//   - EXIGE un token de session généré au démarrage du serveur (GET le distribue,
//     POST le vérifie). Mono-utilisateur, jamais persisté.
//
// La route ne touche JAMAIS `claude` : elle spawn scripts/build-lead.mjs (shell:false,
// argv pur, prospect dérivé d'un id côté client mais re-validé ici), et relaie son
// stdout (stream-json) au navigateur en SSE. À la fermeture de connexion, le child
// est tué proprement.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import {
  isServerLocal,
  isLocalHostHeader,
  isLocalOrigin,
} from "@/lib/runtime-env";

// Le build est un process Node long : runtime nodejs obligatoire, pas de cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Token de session : généré une fois au boot du process serveur (module singleton).
// Non persisté, non deviné par une page distante. Suffisant pour un outil local
// mono-utilisateur (objectif : empêcher un site tiers de déclencher un build via
// le navigateur de l'élève, pas une vraie auth multi-comptes).
const SESSION_TOKEN = randomUUID();
const TOKEN_HEADER = "x-build-token";

// --- Garde-fous partagés ----------------------------------------------------

type Guard = { ok: true } | { ok: false; status: number; message: string };

async function guardLocalRequest(): Promise<Guard> {
  if (!isServerLocal()) {
    return {
      ok: false,
      status: 403,
      message:
        "Le build de site n'est disponible qu'en local, pas sur le déploiement.",
    };
  }
  const h = await headers();
  if (!isLocalHostHeader(h.get("host"))) {
    return { ok: false, status: 403, message: "Hôte non local refusé." };
  }
  // Origin posé par le navigateur sur les requêtes cross-context : on exige local.
  // (Referer en repli pour l'EventSource selon les navigateurs.)
  const origin = h.get("origin") ?? h.get("referer");
  if (origin && !isLocalOrigin(origin)) {
    return { ok: false, status: 403, message: "Origine non locale refusée." };
  }
  return { ok: true };
}

// --- GET : distribue le token + statut local (consommé avant POST) ----------

export async function GET() {
  const guard = await guardLocalRequest();
  if (!guard.ok) {
    return Response.json(
      { local: false, error: guard.message },
      { status: guard.status },
    );
  }
  return Response.json({ local: true, token: SESSION_TOKEN });
}

// --- Helpers SSE ------------------------------------------------------------

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- POST : lance le build et stream le résultat en SSE ---------------------

export async function POST(request: Request) {
  const guard = await guardLocalRequest();
  if (!guard.ok) {
    return Response.json({ error: guard.message }, { status: guard.status });
  }

  // Token de session obligatoire.
  if (request.headers.get(TOKEN_HEADER) !== SESSION_TOKEN) {
    return Response.json(
      { error: "Token de session invalide." },
      { status: 401 },
    );
  }

  // Corps : un prospect dérivé d'un id (pas de texte libre arbitraire).
  let body: {
    id?: unknown;
    entreprise?: unknown;
    ville?: unknown;
    brief?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const id = str(body.id);
  const entreprise = str(body.entreprise);
  const ville = str(body.ville);
  const brief = str(body.brief);

  if (!entreprise) {
    return Response.json(
      { error: "Prospect sans nom d'entreprise — build refusé." },
      { status: 400 },
    );
  }

  // argv pur passé au lanceur. Le lanceur fait tout le travail de robustesse
  // (résolution claude, preflight, ENV) ; la route ne fait que relayer.
  const script = join(process.cwd(), "scripts", "build-lead.mjs");
  const args = [script, "--entreprise", entreprise];
  if (ville) args.push("--ville", ville);
  if (brief) args.push("--brief", brief);
  if (id) args.push("--id", id);

  let child: ChildProcessWithoutNullStreams | null = null;

  // Annulation : on tue TOUT le groupe de process du lanceur (build-lead +
  // claude + ses descendants npm/vercel/chrome), pas seulement le lanceur —
  // sinon claude reste orphelin et continue de consommer le quota.
  const killTree = () => {
    if (!child?.pid) return;
    const pid = child.pid;
    const kill = (sig: NodeJS.Signals) => {
      try {
        process.kill(-pid, sig);
      } catch {
        try {
          child?.kill(sig);
        } catch {
          /* déjà terminé */
        }
      }
    };
    kill("SIGTERM");
    // Escalade : si le lanceur (et son arbre) s'accroche, on force après 5 s.
    setTimeout(() => kill("SIGKILL"), 5000).unref();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (!closed) {
          try {
            controller.enqueue(chunk);
          } catch {
            /* contrôleur déjà fermé */
          }
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      };

      child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: process.env,
        shell: false, // jamais de shell : argv pur
        detached: true, // propre process group → tuable en bloc à l'annulation
      }) as ChildProcessWithoutNullStreams;

      safeEnqueue(sse("start", { entreprise, ville }));

      // stdout du lanceur = stream-json brut, ligne par ligne.
      let buf = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) safeEnqueue(sse("stream", { line }));
        }
      });

      // stderr du lanceur = logs lisibles (preflight, étapes, erreurs non-dev).
      child.stderr.on("data", (chunk: Buffer) => {
        safeEnqueue(sse("log", { text: chunk.toString() }));
      });

      child.on("error", (err) => {
        safeEnqueue(sse("error", { message: err.message }));
        finish();
      });

      child.on("close", (code) => {
        if (buf.trim()) safeEnqueue(sse("stream", { line: buf.trim() }));
        safeEnqueue(sse("done", { code }));
        finish();
      });
    },
    cancel() {
      // Connexion fermée par le navigateur (abandon / fermeture d'onglet) :
      // on tue tout le groupe pour ne pas laisser un build orphelin.
      killTree();
    },
  });

  // Abandon via AbortSignal de la requête (double sécurité avec cancel()).
  request.signal.addEventListener("abort", () => killTree());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
