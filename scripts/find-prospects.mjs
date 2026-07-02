#!/usr/bin/env node
// find-prospects.mjs — Lanceur du skill prospect-finder (scraping Apify + scoring).
//
// Résout python3 hors PATH d'un process non-interactif, localise le skill
// installé (~/.claude/skills/prospect-finder), puis lance apify_scrape.py qui
// scrape Google Maps via Apify ET enchaîne le scoring tout seul. Le CSV final
// (prospects_appels.csv) est écrit dans --outdir : la route API le relit ensuite.
//
// Le token Apify n'est PAS géré ici : apify_scrape.py le lit lui-même depuis
// APIFY_TOKEN ou ~/.apify_token. On se contente de transmettre l'environnement.
//
// Usage :
//   node scripts/find-prospects.mjs --metier "plombier" --ville "Bayonne" --outdir /tmp/x [--max 40]
//
// Les logs lisibles du scraping partent sur stderr ; stdout reste libre.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const IS_WIN = platform() === "win32";
const log = (...a) => process.stderr.write(a.join(" ") + "\n");

// --- Parsing argv minimal (pas de dépendance) -----------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

// --- Résolution robuste de python3 -----------------------------------------
// Un process spawné par Next n'a pas le PATH du login-shell : on le reconstruit
// puis on teste les emplacements habituels (Homebrew, /usr/bin, /usr/local).

function loginShellPath() {
  try {
    if (IS_WIN) {
      const r = spawnSync("cmd.exe", ["/c", "echo %PATH%"], { encoding: "utf8" });
      return (r.stdout || "").trim();
    }
    const shell = process.env.SHELL || "/bin/zsh";
    const r = spawnSync(shell, ["-lic", "echo $PATH"], { encoding: "utf8" });
    return (r.stdout || "").trim();
  } catch {
    return "";
  }
}

function which(cmd, extraPath) {
  const sep = IS_WIN ? ";" : ":";
  const dirs = (extraPath || process.env.PATH || "").split(sep).filter(Boolean);
  const names = IS_WIN ? [cmd + ".exe", cmd] : [cmd];
  for (const dir of dirs) {
    for (const n of names) {
      const full = join(dir, n);
      if (existsSync(full)) return full;
    }
  }
  return null;
}

function resolvePython(fullPath) {
  return (
    which("python3") ||
    which("python3", fullPath) ||
    ["/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3"].find(
      (p) => existsSync(p),
    ) ||
    which("python", fullPath) ||
    null
  );
}

function buildChildEnv(fullPath) {
  const sep = IS_WIN ? ";" : ":";
  const merged = [fullPath, process.env.PATH]
    .filter(Boolean)
    .join(sep)
    .split(sep)
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(sep);
  return { ...process.env, PATH: merged };
}

// --- Aide -------------------------------------------------------------------

function printHelp() {
  log(`find-prospects — lanceur du skill prospect-finder (scraping Apify + scoring)

Usage :
  node scripts/find-prospects.mjs --metier "<métier>" --ville "<ville>" --outdir <dossier> [--max 40]

Options :
  --metier <métier>   Métier ciblé (obligatoire), ex : "plombier"
  --ville  <ville>    Ville ciblée (obligatoire), ex : "Bayonne"
  --outdir <dossier>  Dossier où écrire scrape_brut.csv + prospects_appels.csv (obligatoire)
  --max    <n>        Fiches max scrapées (défaut 40)
  --help, -h          Cette aide

prospects_appels.csv (résultat scoré, prêt pour le CRM) est écrit dans --outdir.`);
}

// --- Main -------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const metier = typeof args.metier === "string" ? args.metier.trim() : "";
  const ville = typeof args.ville === "string" ? args.ville.trim() : "";
  const outdir = typeof args.outdir === "string" ? args.outdir.trim() : "";
  const max = Number.isFinite(Number(args.max)) ? Math.min(Math.max(Number(args.max), 1), 120) : 40;

  if (!metier || !ville) {
    log("Précise --metier et --ville. Ex : --metier \"plombier\" --ville \"Bayonne\".");
    process.exit(1);
  }
  if (!outdir || !existsSync(outdir)) {
    log("--outdir manquant ou inexistant (la route API doit le créer avant).");
    process.exit(1);
  }

  // Localisation du skill prospect-finder (emplacement standard d'install).
  const skillScript = join(
    homedir(),
    ".claude",
    "skills",
    "prospect-finder",
    "scripts",
    "apify_scrape.py",
  );
  if (!existsSync(skillScript)) {
    log(
      "Skill prospect-finder introuvable.\n" +
        `Attendu : ${skillScript}\n` +
        "Installe-le dans ~/.claude/skills/prospect-finder/.",
    );
    process.exit(1);
  }

  const fullPath = loginShellPath();
  const python = resolvePython(fullPath);
  if (!python) {
    log("python3 introuvable (PATH, login-shell, Homebrew, /usr/bin). Installe Python 3.");
    process.exit(1);
  }
  const childEnv = buildChildEnv(fullPath);

  // Token Apify : apify_scrape.py le lit lui-même. On vérifie juste pour un
  // message clair en amont (sinon le script python sort un code 2 cryptique).
  const hasToken =
    Boolean((childEnv.APIFY_TOKEN || "").trim()) ||
    existsSync(join(homedir(), ".apify_token"));
  if (!hasToken) {
    log(
      "Token Apify manquant.\n" +
        "Crée un compte gratuit sur console.apify.com, puis colle ton token dans ~/.apify_token\n" +
        "(ou exporte APIFY_TOKEN=apify_api_xxx).",
    );
    process.exit(1);
  }

  // Une seule requête "métier ville" (la barre du CRM = un secteur, une zone).
  const requete = `${metier} ${ville}`;
  log(`Scraping Apify : "${requete}" (max ${max} fiches) + scoring auto…\n`);

  // child déclaré AVANT les handlers : un SIGTERM tôt doit pouvoir propager.
  let child = null;
  let killTimer = null;

  // SIGTERM/SIGINT (route qui annule) : on tue tout le groupe du python, sinon
  // apify_scrape.py / score_prospects.py restent orphelins. Escalade → SIGKILL.
  const killChildGroup = (sig) => {
    try {
      if (child?.pid) process.kill(-child.pid, sig);
    } catch {
      try {
        child?.kill(sig);
      } catch {
        /* déjà terminé */
      }
    }
  };
  let cancelling = false;
  const cancelScrape = () => {
    if (cancelling) return; // idempotent (double signal)
    cancelling = true;
    killChildGroup("SIGTERM");
    if (!child) process.exit(143);
    killTimer = setTimeout(() => killChildGroup("SIGKILL"), 4000);
    killTimer.unref?.();
  };
  process.on("SIGTERM", cancelScrape);
  process.on("SIGINT", cancelScrape);

  child = spawn(
    python,
    [skillScript, requete, "--max", String(max)],
    {
      cwd: outdir, // apify_scrape.py + score_prospects.py écrivent dans le cwd
      env: childEnv,
      shell: false, // argv pur, aucune interpolation shell
      detached: true, // propre process group → tuable en bloc à l'annulation
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  // Tout le stdout/stderr du python = logs lisibles relayés sur notre stderr.
  child.stdout.on("data", (c) => process.stderr.write(c));
  child.stderr.on("data", (c) => process.stderr.write(c));

  child.on("error", (err) => {
    killChildGroup("SIGKILL");
    log(`\nLe process python n'a pas pu démarrer : ${err.message}`);
    process.exit(1);
  });
  child.on("close", (code) => {
    if (killTimer) clearTimeout(killTimer);
    log(`\nScraping terminé (code ${code}).`);
    process.exit(code ?? 1);
  });
}

main();
