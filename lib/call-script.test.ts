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
  it("site-mort et reseaux gardent le socle hook → retournement → proposition + verrouillage + sortie", () => {
    for (const angle of ["site-mort", "reseaux"] as const) {
      const steps = CALL_STEPS[angle];
      expect(steps).toHaveLength(5);
      expect(steps[0].titre).toMatch(/hook/i);
      expect(steps[1].titre).toMatch(/retournement/i);
      expect(steps[2].titre).toMatch(/proposition/i);
      expect(steps[4].titre).toMatch(/sortie/i);
    }
  });
  it("sans-site a le nouveau flow hook → raison de l'appel → proposition → verrouillage + canal → sortie", () => {
    const steps = CALL_STEPS["sans-site"];
    expect(steps).toHaveLength(5);
    expect(steps[0].titre).toMatch(/hook/i);
    expect(steps[1].titre).toMatch(/raison de l'appel/i);
    expect(steps[2].titre).toMatch(/proposition/i);
    expect(steps[3].titre).toMatch(/verrouillage/i);
    expect(steps[4].titre).toMatch(/sortie/i);
  });
  it("ne laisse plus de placeholder non géré ([prénom]) dans aucune séquence", () => {
    const texteComplet = Object.values(CALL_STEPS)
      .flat()
      .map((s) => s.texte)
      .join(" ");
    expect(texteComplet).not.toMatch(/\[prénom\]/);
  });
});
