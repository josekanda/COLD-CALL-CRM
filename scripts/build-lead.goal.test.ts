import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BUILD_LEAD = join(here, "build-lead.mjs");

// Boîte-noire : on lance le lanceur en --dry-run (preflight bypassé) et on
// capture le /goal qu'il affiche. Zéro claude lancé, zéro quota.
function dryRunGoal(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BUILD_LEAD, "--dry-run", ...args], {
      env: { ...process.env, BUILD_LEAD_SKIP_PREFLIGHT: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.stderr.on("data", (c: Buffer) => (out += c.toString()));
    child.on("error", reject);
    child.on("close", () => resolve(out));
  });
}

describe("buildGoal — /goal MVP-first (via --dry-run)", () => {
  it("décrit le mode MVP-first, les phases, le checkpoint et le handoff", async () => {
    const goal = await dryRunGoal([
      "--entreprise",
      "Garage Test",
      "--ville",
      "Anglet",
    ]);
    expect(goal).toMatch(/mvp-first|minimal viable/i);
    expect(goal).toMatch(/checkpoint|deploy/i);
    expect(goal).toMatch(/handoff/i);
    expect(goal).toMatch(/375px|screenshot/i);
    expect(goal).toMatch(/formulaire de devis/i);
  });

  it("ne contient PLUS la porte bloquante design >= 85 ni la boucle multi-tours", async () => {
    const goal = await dryRunGoal([
      "--entreprise",
      "Garage Test",
      "--ville",
      "Anglet",
    ]);
    expect(goal).not.toMatch(/85\s*\/\s*100/);
    expect(goal).not.toMatch(/design\s*(>=|≥)\s*85/i);
  });
});
