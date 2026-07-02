// app/api/scrape/route.ts — Route LOCALE qui pilote le skill prospect-finder.
//
// Mêmes garde-fous que /api/build (le scraping a besoin du token Apify local) :
//   - REFUSE si l'app tourne sur Vercel (VERCEL=1).
//   - REFUSE si Host/Origin ne sont pas localhost.
//   - EXIGE un token de session généré au boot (GET le distribue, POST le vérifie).
//
// La route crée un dossier temp, y spawn scripts/find-prospects.mjs (qui lance
// le scraping + scoring), relaie ses logs en SSE, puis relit prospects_appels.csv
// dans ce dossier et le renvoie au navigateur (event `done`). Le dossier temp est
// nettoyé à la fin.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import {
  isServerLocal,
  isLocalHostHeader,
  isLocalOrigin,
} from "@/lib/runtime-env";

// Scraping = process long (run Apify + polling) : runtime nodejs, pas de cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TOKEN = randomUUID();
const TOKEN_HEADER = "x-scrape-token";

// --- Garde-fou local (identique à /api/build) -------------------------------

type Guard = { ok: true } | { ok: false; status: number; message: string };

async function guardLocalRequest(): Promise<Guard> {
  if (!isServerLocal()) {
    return {
      ok: false,
      status: 403,
      message:
        "Le scraping n'est disponible qu'en local, pas sur le déploiement.",
    };
  }
  const h = await headers();
  if (!isLocalHostHeader(h.get("host"))) {
    return { ok: false, status: 403, message: "Hôte non local refusé." };
  }
  const origin = h.get("origin") ?? h.get("referer");
  if (origin && !isLocalOrigin(origin)) {
    return { ok: false, status: 403, message: "Origine non locale refusée." };
  }
  return { ok: true };
}

// --- GET : distribue le token + statut local -------------------------------

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

// --- POST : lance le scraping et stream le résultat -------------------------

export async function POST(request: Request) {
  const guard = await guardLocalRequest();
  if (!guard.ok) {
    return Response.json({ error: guard.message }, { status: guard.status });
  }
  if (request.headers.get(TOKEN_HEADER) !== SESSION_TOKEN) {
    return Response.json(
      { error: "Token de session invalide." },
      { status: 401 },
    );
  }

  let body: { metier?: unknown; ville?: unknown; max?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const metier = str(body.metier);
  const ville = str(body.ville);
  const max = Number.isFinite(Number(body.max)) ? Number(body.max) : 40;

  if (!metier || !ville) {
    return Response.json(
      { error: "Précise un métier ET une ville pour scraper." },
      { status: 400 },
    );
  }

  // Dossier temp jetable : les scripts python y écrivent leurs CSV.
  const outdir = mkdtempSync(join(tmpdir(), "aura-scrape-"));
  const script = join(process.cwd(), "scripts", "find-prospects.mjs");
  const args = [
    script,
    "--metier",
    metier,
    "--ville",
    ville,
    "--max",
    String(max),
    "--outdir",
    outdir,
  ];

  let child: ChildProcessWithoutNullStreams | null = null;

  // Annulation : on tue tout le groupe de process du lanceur (find-prospects +
  // python apify/scoring), pas seulement le lanceur — sinon le python reste orphelin.
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
      const cleanup = () => {
        try {
          rmSync(outdir, { recursive: true, force: true });
        } catch {
          /* best effort */
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      };

      child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
        detached: true, // propre process group → tuable en bloc à l'annulation
      }) as ChildProcessWithoutNullStreams;

      safeEnqueue(sse("start", { metier, ville }));

      // Le lanceur envoie tous ses logs lisibles sur stderr.
      child.stderr.on("data", (chunk: Buffer) => {
        safeEnqueue(sse("log", { text: chunk.toString() }));
      });
      child.stdout.on("data", (chunk: Buffer) => {
        safeEnqueue(sse("log", { text: chunk.toString() }));
      });

      child.on("error", (err) => {
        safeEnqueue(sse("error", { message: err.message }));
        finish();
      });

      child.on("close", (code) => {
        // Relit le CSV scoré écrit par le scoring dans outdir.
        const csvPath = join(outdir, "prospects_appels.csv");
        if (code === 0 && existsSync(csvPath)) {
          try {
            const csv = readFileSync(csvPath, "utf-8");
            const count = Math.max(
              csv
                .trim()
                .split("\n")
                .filter((l) => l.trim() !== "").length - 1,
              0,
            );
            safeEnqueue(sse("done", { code, csv, count }));
          } catch (e) {
            safeEnqueue(
              sse("error", {
                message:
                  e instanceof Error ? e.message : "Lecture du CSV impossible.",
              }),
            );
          }
        } else if (code === 0) {
          safeEnqueue(
            sse("done", {
              code,
              csv: "",
              count: 0,
              note: "Aucun prospect appelable après filtrage.",
            }),
          );
        } else {
          safeEnqueue(
            sse("error", {
              message: `Le scraping s'est arrêté (code ${code}).`,
            }),
          );
        }
        finish();
      });
    },
    cancel() {
      killTree();
    },
  });

  request.signal.addEventListener("abort", () => killTree());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
