import { describe, it, expect } from "vitest";
import { fillScript, CALL_STEPS } from "./call-script";

describe("fillScript", () => {
  it("substitue entreprise / métier / ville, garde [prénom]", () => {
    const out = fillScript(
      "Bonjour [entreprise] à [ville], vous êtes [métier] ? Merci [prénom].",
      {
        entreprise: "Long Hai",
        ville: "Le Bouscat",
        activite: "Restaurant",
      },
    );
    expect(out).toBe(
      "Bonjour Long Hai à Le Bouscat, vous êtes Restaurant ? Merci [prénom].",
    );
  });
  it("met [ville]/[métier] en repli si vide", () => {
    const out = fillScript("[ville]-[métier]", {
      entreprise: "X",
      ville: "",
      activite: "",
    });
    expect(out).toBe("[ville]-[métier]");
  });
});

describe("CALL_STEPS", () => {
  it("socle de 3 temps (hook → retournement → proposition) + verrouillage + sortie", () => {
    expect(CALL_STEPS).toHaveLength(5);
    expect(CALL_STEPS[0].titre).toMatch(/hook/i);
    expect(CALL_STEPS[1].titre).toMatch(/retournement/i);
    expect(CALL_STEPS[2].titre).toMatch(/proposition/i);
    expect(CALL_STEPS[4].titre).toMatch(/sortie/i);
  });
  it("ne laisse plus de placeholder non géré ([prénom]) dans le script", () => {
    const texteComplet = CALL_STEPS.map((s) => s.texte).join(" ");
    expect(texteComplet).not.toMatch(/\[prénom\]/);
  });
});
