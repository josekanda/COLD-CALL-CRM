import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BUILD_LEAD = join(here, "build-lead.mjs");
const FAKE_CLAUDE = join(here, "__fixtures__", "fake-claude.mjs");

const alive = (pid?: number) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0); // signal 0 = test d'existence
    return true;
  } catch {
    return false;
  }
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Test boîte-noire : on lance build-lead.mjs exactement comme la route (detached),
// mais avec un FAUX claude (BUILD_LEAD_CLAUDE_BIN) et le preflight bypassé — donc
// ZÉRO appel au vrai claude, zéro quota consommé.
describe("build-lead — intégration kill d'arborescence + qa_check", () => {
  let tmp = "";
  let launcherPid: number | undefined;
  const seen: { fakePid?: number; grandchildPid?: number } = {};

  beforeAll(() => {
    chmodSync(FAKE_CLAUDE, 0o755); // exécutable direct via son shebang node
  });

  afterEach(() => {
    // Filet de sécurité : on ne laisse aucun process de test traîner.
    for (const pid of [launcherPid, seen.fakePid, seen.grandchildPid]) {
      if (alive(pid)) {
        try {
          process.kill(pid as number, "SIGKILL");
        } catch {
          /* déjà mort */
        }
      }
    }
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  });

  it("copie qa_check.py dans le dossier de travail, puis tue TOUT le groupe au SIGTERM (zéro orphelin)", async () => {
    tmp = mkdtempSync(join(tmpdir(), "build-lead-it-"));

    // Skill factice : un qa_check.py bidon que build-lead doit copier (B3).
    const skillScripts = join(tmp, "skill", "scripts");
    mkdirSync(skillScripts, { recursive: true });
    writeFileSync(join(skillScripts, "qa_check.py"), "print('ok')\n");

    const child = spawn(
      process.execPath,
      [BUILD_LEAD, "--entreprise", "Test Commerce", "--ville", "Testville"],
      {
        cwd: tmp,
        detached: true, // comme la route → propre groupe, tuable via -pid
        env: {
          ...process.env,
          BUILD_LEAD_CLAUDE_BIN: FAKE_CLAUDE,
          BUILD_LEAD_SKIP_PREFLIGHT: "1",
          LEAD_TO_SITE_SKILL_DIR: join(tmp, "skill"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    launcherPid = child.pid;

    // Le stdout de build-lead relaie celui du faux claude → on y lit les PIDs.
    await new Promise<void>((resolve, reject) => {
      let buf = "";
      const to = setTimeout(
        () => reject(new Error("le faux claude n'a jamais démarré")),
        8000,
      );
      child.stdout!.on("data", (c: Buffer) => {
        buf += c.toString();
        const m = buf.match(/\{"fakePid":\d+,"grandchildPid":\d+\}/);
        if (m) {
          Object.assign(seen, JSON.parse(m[0]));
          clearTimeout(to);
          resolve();
        }
      });
      child.on("error", reject);
    });

    // Le "build" tourne : le faux claude ET son sous-process sont vivants.
    expect(alive(seen.fakePid)).toBe(true);
    expect(alive(seen.grandchildPid)).toBe(true);

    // B3 : qa_check.py a bien été copié dans clients/<slug>/.
    const clientDir = join(tmp, "clients", "test-commerce-testville");
    expect(existsSync(join(clientDir, "qa_check.py"))).toBe(true);

    // A : on tue le GROUPE du lanceur (exactement ce que fait la route). Le
    // lanceur doit propager le kill à tout le groupe du faux claude.
    process.kill(-(launcherPid as number), "SIGTERM");

    for (
      let i = 0;
      i < 50 &&
      (alive(seen.fakePid) || alive(seen.grandchildPid) || alive(launcherPid));
      i++
    ) {
      await wait(100);
    }

    // Aucun orphelin : faux claude, son sous-process ET le lanceur sont morts.
    expect(alive(seen.fakePid)).toBe(false);
    expect(alive(seen.grandchildPid)).toBe(false);
    expect(alive(launcherPid)).toBe(false);
  }, 15000);
});
