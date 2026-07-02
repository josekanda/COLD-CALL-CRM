#!/usr/bin/env node
// build-lead.mjs — Lanceur robuste de build de site lead-to-site.
//
// Résout le binaire claude de façon fiable (hors PATH d'un process non-interactif),
// reconstruit un ENV complet, lance un preflight (binaire / auth / vercel), puis
// démarre claude en headless sur une condition /goal construite depuis un prospect.
// Le stream-json est relayé sur stdout pour qu'une route SSE le répercute.
//
// Usage :
//   node scripts/build-lead.mjs --entreprise "Garage Martin" --ville "Anglet" [--id p_12] [--brief "..."]
//   node scripts/build-lead.mjs --dry-run --entreprise "Garage Martin" --ville "Anglet"
//   node scripts/build-lead.mjs --help
//
// Conçu pour être appelé en CLI ou spawné par une route API (archi hybride).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const IS_WIN = platform() === "win32";

// --- Petits helpers d'affichage (lisible en terminal, neutre en log) -------

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};
const useColor = process.stderr.isTTY;
const paint = (col, s) => (useColor ? col + s + c.reset : s);
// Tout le bruit de log part sur stderr : stdout reste un canal stream-json propre
// pour la route SSE.
const log = (...a) => process.stderr.write(a.join(" ") + "\n");

// --- Parsing argv minimal (pas de dépendance) -----------------------------

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

// --- Résolution robuste du binaire claude ----------------------------------
// claude est un alias shell vers ~/.local/bin/claude : invisible pour un process
// non-interactif. On teste, dans l'ordre : PATH courant, ~/.local/bin, login-shell,
// puis chemins Windows.

function loginShellPath() {
  // Récupère le PATH d'un login-shell pour retrouver node/bun/vercel/claude.
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
  // Cherche un binaire dans un PATH donné, sans passer par le shell.
  const sep = IS_WIN ? ";" : ":";
  const dirs = (extraPath || process.env.PATH || "").split(sep).filter(Boolean);
  const names = IS_WIN ? [cmd + ".exe", cmd + ".cmd", cmd + ".bat", cmd] : [cmd];
  for (const dir of dirs) {
    for (const n of names) {
      const full = join(dir, n);
      if (existsSync(full)) return full;
    }
  }
  return null;
}

function resolveClaude(fullPath) {
  // 1) PATH courant
  let found = which("claude");
  if (found) return found;

  // 2) ~/.local/bin/claude (install par défaut du CLI)
  const local = join(homedir(), ".local", "bin", IS_WIN ? "claude.exe" : "claude");
  if (existsSync(local)) return local;

  // 3) login-shell ("which claude" / "where claude")
  try {
    if (IS_WIN) {
      const r = spawnSync("where", ["claude"], { encoding: "utf8" });
      const first = (r.stdout || "").split(/\r?\n/).find(Boolean);
      if (first && existsSync(first.trim())) return first.trim();
    } else {
      const shell = process.env.SHELL || "/bin/zsh";
      // command -v contourne l'alias et renvoie le vrai chemin du binaire.
      const r = spawnSync(shell, ["-lic", "command -v claude"], { encoding: "utf8" });
      const line = (r.stdout || "").split(/\r?\n/).find(Boolean);
      if (line && existsSync(line.trim())) return line.trim();
    }
  } catch {
    /* ignore */
  }

  // 4) reconstruit le PATH login-shell et re-cherche
  found = which("claude", fullPath);
  if (found) return found;

  // 5) Windows : %LOCALAPPDATA%
  if (IS_WIN && process.env.LOCALAPPDATA) {
    const candidates = [
      join(process.env.LOCALAPPDATA, "Claude", "claude.exe"),
      join(process.env.LOCALAPPDATA, "Programs", "claude", "claude.exe"),
    ];
    for (const cand of candidates) if (existsSync(cand)) return cand;
  }

  return null;
}

// --- ENV complet pour le child ---------------------------------------------
// Sans le PATH du login-shell, les hooks node/bun internes du CLI plantent.

function buildChildEnv(fullPath) {
  const sep = IS_WIN ? ";" : ":";
  const merged = [fullPath, process.env.PATH]
    .filter(Boolean)
    .join(sep)
    .split(sep)
    .filter((v, i, arr) => v && arr.indexOf(v) === i) // dédup en gardant l'ordre
    .join(sep);
  return { ...process.env, PATH: merged };
}

// --- Construction de la condition /goal (sans interpolation shell) ----------
// Reprend l'esprit de cmdFor() (lib/prospect.ts) + boucle visuelle premium / Vercel.

function buildGoal({ entreprise, ville, brief, id }) {
  const lieu = ville || "[ville]";
  // /goal "MVP-first" : on vise un LIVRABLE GARANTI (site live qui capte des leads)
  // plutôt qu'un site parfait. Pilote la skill lead-to-site en mode MVP-first ;
  // le succès = le checkpoint déployé (phase 2), le reste est best-effort.
  const lignes = [
    `/goal Construis et déploie le site de "${entreprise}" à ${lieu} via la skill lead-to-site en mode MVP-first (references/build-mvp-first.md). Objectif : un site EN LIGNE qui capte des leads, pas un site parfait.`,
    brief ? `Brief fourni : ${brief}.` : null,
    id ? `(prospect id ${id}).` : null,
    `Déroule les 5 phases dans l'ordre : (0) recherche express + BRIEF.md ; (1) site minimal viable assemblé dans app/page.tsx — header, hero, services, FORMULAIRE DE DEVIS fonctionnel + bouton d'appel, footer ; (2) CHECKPOINT — npm run build sort 0 puis deploy Vercel, et affiche l'URL live ; (3) si le budget le permet, enrichis (sections bonus, SEO géolocalisé, analytics + événements + notif lead) et redéploie ; (4) UNE seule passe de contrôle visuel — 1 screenshot 375px et 1 screenshot 1440px lus dans cette conversation, corrige les défauts criants (overflow, texte coupé, image cassée) une fois, redéploie si besoin ; (5) écris HANDOFF.md (les 20 % restants à peaufiner + l'URL live).`,
    `SUCCÈS = phase 2 atteinte : npm run build sort 0 ET le site est déployé avec une URL live affichée. Les phases 3 et 4 sont best-effort dans le budget. Lance python3 qa_check.py . et montre sa sortie À TITRE INFORMATIF — ce n'est PAS une condition d'arrêt. Ne vise AUCUNE note design imposée et ne reboucle pas en multi-tours.`,
    `Règle absolue : zéro mention d'outil ou d'IA nulle part dans le livrable.`,
    `Condition de fin : l'URL Vercel live ET le chemin de HANDOFF.md apparaissent dans cette conversation. or stop after 6 turns.`,
  ].filter(Boolean);
  return lignes.join(" ");
}

function slugify(s) {
  return (s || "site")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "site";
}

// --- Preflight --------------------------------------------------------------

function runQuiet(cmd, args, env, timeoutMs) {
  return spawnSync(cmd, args, {
    env,
    encoding: "utf8",
    timeout: timeoutMs,
    shell: false, // jamais de shell : args en argv
  });
}

function preflight({ claudeBin, childEnv }) {
  const checks = [];

  // 1) Binaire claude trouvé
  checks.push({
    ok: Boolean(claudeBin),
    label: "Binaire claude trouvé",
    detail: claudeBin || "introuvable (PATH, ~/.local/bin, login-shell, %LOCALAPPDATA%)",
  });

  // 2) Auth OK : un "claude -p" court doit répondre.
  let authOk = false;
  let authDetail = "non testé (binaire absent)";
  if (claudeBin) {
    const r = runQuiet(
      claudeBin,
      ["-p", "ok", "--output-format", "text", "--dangerously-skip-permissions"],
      childEnv,
      60000,
    );
    authOk = r.status === 0 && !r.error && (r.stdout || "").trim().length > 0;
    if (r.error && r.error.code === "ETIMEDOUT") authDetail = "timeout (>60s) — réessaie";
    else if (authOk) authDetail = "réponse reçue";
    else authDetail = ((r.stderr || r.stdout || "").trim().split("\n")[0] || "pas de réponse").slice(0, 160);
  }
  checks.push({ ok: authOk, label: "Authentification claude OK", detail: authDetail });

  // 3) vercel whoami loggé
  const vercelBin = which("vercel", childEnv.PATH);
  let vercelOk = false;
  let vercelDetail = "vercel introuvable dans le PATH";
  if (vercelBin) {
    const r = runQuiet(vercelBin, ["whoami"], childEnv, 30000);
    const out = (r.stdout || "").trim();
    vercelOk = r.status === 0 && out.length > 0;
    vercelDetail = vercelOk ? `connecté (${out})` : "non connecté — lance `vercel login`";
  }
  checks.push({ ok: vercelOk, label: "Vercel connecté (vercel whoami)", detail: vercelDetail });

  return checks;
}

function printPreflight(checks) {
  log(paint(c.bold, "\nPreflight — prérequis du build :"));
  for (const ch of checks) {
    const mark = ch.ok ? paint(c.green, "  [OK]    ") : paint(c.red, "  [MANQUE]");
    log(`${mark} ${ch.label}` + paint(c.dim, ` — ${ch.detail}`));
  }
  log("");
}

// --- Message d'erreur non-dev -----------------------------------------------

function fail(message) {
  log(paint(c.red, "\nImpossible de lancer le build.\n"));
  log(message + "\n");
  process.exit(1);
}

// --- qa_check.py dans le dossier de travail ---------------------------------
// La condition /goal lance `python3 qa_check.py .` : le script doit donc être
// présent dans le cwd de l'agent. On le copie depuis la skill lead-to-site
// (best-effort ; override du chemin skill via LEAD_TO_SITE_SKILL_DIR pour les tests).
function ensureQaCheck(clientDir) {
  const skillDir =
    process.env.LEAD_TO_SITE_SKILL_DIR ||
    join(homedir(), ".claude", "skills", "lead-to-site");
  const src = join(skillDir, "scripts", "qa_check.py");
  const dest = join(clientDir, "qa_check.py");
  if (!existsSync(src)) {
    log(paint(c.yellow, `qa_check.py introuvable (${src}) — la QA finale ne pourra pas le lancer.`));
    return false;
  }
  try {
    copyFileSync(src, dest);
    log(paint(c.dim, "qa_check.py copié dans le dossier de travail.\n"));
    return true;
  } catch (e) {
    log(paint(c.yellow, `Copie de qa_check.py impossible : ${e.message}`));
    return false;
  }
}

// --- Lancement du build claude headless -------------------------------------

function runBuild({ claudeBin, childEnv, goal, slug }) {
  // cwd jetable dédié sous clients/<slug>/, avec git init pour rollback.
  const repoRoot = process.cwd();
  const clientDir = join(repoRoot, "clients", slug);
  mkdirSync(clientDir, { recursive: true });
  const git = which("git", childEnv.PATH) || "git";
  spawnSync(git, ["init"], { cwd: clientDir, env: childEnv, shell: false });
  log(paint(c.dim, `Dossier de travail : ${clientDir} (git init OK, rollback possible)\n`));

  ensureQaCheck(clientDir);

  // Flags vérifiés via `claude --help` (v2.1.178) :
  //   -p/--print, --output-format stream-json (+ --verbose obligatoire),
  //   --dangerously-skip-permissions (le bon flag de bypass).
  const args = [
    "-p",
    goal,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--dangerously-skip-permissions",
  ];

  // child déclaré AVANT les handlers : un SIGTERM qui arrive tôt doit pouvoir
  // propager le kill (sinon claude, dans son propre groupe, resterait orphelin).
  let child = null;
  let killTimer = null;

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

  // SIGTERM/SIGINT (route qui annule, Ctrl-C) : on tue TOUT le groupe du child,
  // sinon claude et ses descendants restent orphelins et brûlent le quota.
  // Escalade SIGTERM → SIGKILL si claude s'accroche (ignore SIGTERM / I/O bloqué).
  let cancelling = false;
  const cancelBuild = () => {
    if (cancelling) return; // idempotent (double signal, cancel + abort)
    cancelling = true;
    killChildGroup("SIGTERM");
    if (!child) process.exit(143); // rien n'a démarré : on sort directement
    killTimer = setTimeout(() => killChildGroup("SIGKILL"), 4000);
    killTimer.unref?.();
    // child.on("close") ci-dessous appellera process.exit quand claude sera mort.
  };
  process.on("SIGTERM", cancelBuild);
  process.on("SIGINT", cancelBuild);

  log(paint(c.cyan, `Lancement du build (${claudeBin})…\n`));

  child = spawn(claudeBin, args, {
    cwd: clientDir,
    env: childEnv,
    shell: false, // argv pur, aucune interpolation shell
    detached: true, // propre process group → tuable en bloc (claude + npm/vercel/chrome/subagents)
    stdio: ["ignore", "pipe", "inherit"],
  });

  // Relais du stream-json : chaque ligne JSON repartie telle quelle sur notre
  // stdout (pour la route SSE) + une trace lisible sur stderr pour le terminal.
  let buf = "";
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk); // canal brut pour SSE
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      summarizeEvent(line);
    }
  });

  child.on("error", (err) => {
    killChildGroup("SIGKILL"); // au cas où un descendant aurait déjà démarré
    fail(`Le process claude n'a pas pu démarrer : ${err.message}`);
  });
  child.on("close", (code) => {
    if (killTimer) clearTimeout(killTimer);
    log(paint(code === 0 ? c.green : c.red, `\nBuild terminé (code ${code}).`));
    process.exit(code ?? 1);
  });
}

function summarizeEvent(line) {
  const t = line.trim();
  if (!t) return;
  try {
    const ev = JSON.parse(t);
    if (ev.type === "assistant" && ev.message?.content) {
      const txt = ev.message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      if (txt.trim()) log(paint(c.dim, "› ") + txt.trim().slice(0, 200));
    } else if (ev.type === "result") {
      log(paint(c.dim, `‹ result (${ev.subtype ?? "?"})`));
    }
  } catch {
    /* partiel/non-JSON : déjà relayé brut sur stdout */
  }
}

// --- Aide -------------------------------------------------------------------

function printHelp() {
  log(`${paint(c.bold, "build-lead")} — lanceur de build lead-to-site (Node ESM)

Usage :
  node scripts/build-lead.mjs --entreprise "<nom>" --ville "<ville>" [options]

Options :
  --entreprise <nom>   Nom du commerce (obligatoire hors --help)
  --ville <ville>      Ville du commerce
  --brief "<texte>"    Brief libre additionnel (DA, services à mettre en avant…)
  --id <id>            Id du prospect (traçabilité)
  --dry-run            Preflight + affiche la condition /goal, SANS lancer le build
  --help, -h           Affiche cette aide

Exemples :
  node scripts/build-lead.mjs --dry-run --entreprise "Garage Martin" --ville "Anglet"
  node scripts/build-lead.mjs --entreprise "Garage Martin" --ville "Anglet" --brief "bleus techniques"

Le stream-json du build part sur stdout (pour une route SSE) ; les logs lisibles
partent sur stderr.`);
}

// --- Main -------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // PATH du login-shell : indispensable pour retrouver claude/node/bun/vercel.
  const fullPath = loginShellPath();
  // BUILD_LEAD_CLAUDE_BIN : override du binaire claude (tests / env figés).
  const claudeBin = process.env.BUILD_LEAD_CLAUDE_BIN || resolveClaude(fullPath);
  const childEnv = buildChildEnv(fullPath);

  // Preflight systématique (dry-run ou vrai build).
  // BUILD_LEAD_SKIP_PREFLIGHT=1 : bypass (tests qui ne lancent pas claude/vercel).
  const skipPreflight = process.env.BUILD_LEAD_SKIP_PREFLIGHT === "1";
  const checks = skipPreflight ? [] : preflight({ claudeBin, childEnv });
  if (!skipPreflight) printPreflight(checks);

  const allOk = skipPreflight || checks.every((ch) => ch.ok);

  // Validation des entrées (après preflight pour montrer aussi l'état système).
  const entreprise = typeof args.entreprise === "string" ? args.entreprise.trim() : "";
  if (!entreprise) {
    fail(
      "Précise au moins le nom du commerce : --entreprise \"Nom du commerce\" --ville \"Ville\".\n" +
        "Tape `node scripts/build-lead.mjs --help` pour l'aide.",
    );
  }

  const goal = buildGoal({
    entreprise,
    ville: typeof args.ville === "string" ? args.ville.trim() : "",
    brief: typeof args.brief === "string" ? args.brief.trim() : "",
    id: typeof args.id === "string" ? args.id.trim() : "",
  });
  const slug = slugify(entreprise + (args.ville ? "-" + args.ville : ""));

  // Dry-run : on s'arrête après le preflight + affichage de la condition /goal.
  if (args.dryRun) {
    log(paint(c.bold, "Condition /goal construite :"));
    log(paint(c.cyan, goal) + "\n");
    log(paint(c.dim, `Dossier de travail prévu : clients/${slug}/`));
    if (!allOk) log(paint(c.yellow, "\nDry-run OK, mais un prérequis manque — corrige avant le vrai build."));
    else log(paint(c.green, "\nDry-run OK — prérequis verts, prêt à builder."));
    process.exit(allOk ? 0 : 1);
  }

  // Vrai build : on refuse si un prérequis manque.
  if (!allOk) {
    fail(
      "Un prérequis est en rouge ci-dessus. Corrige-le puis relance.\n" +
        "Rappels : claude doit être installé et connecté, et `vercel login` doit être fait.",
    );
  }

  runBuild({ claudeBin, childEnv, goal, slug });
}

main();
