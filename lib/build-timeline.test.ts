import { describe, it, expect } from "vitest";
import {
  detectPhase,
  nextPhase,
  extractLiveUrl,
  assistantText,
  type Phase,
} from "./build-timeline";

describe("detectPhase", () => {
  it("repère la phase de recherche", () => {
    expect(detectPhase("Je récupère la fiche Google et les avis")).toBe(
      "recherche",
    );
  });
  it("repère la QA", () => {
    expect(detectPhase("Lancement de qa_check.py")).toBe("qa");
  });
  it("repère le déploiement", () => {
    expect(detectPhase("Mise en ligne sur Vercel")).toBe("deploy");
  });
  it("repère l'URL live en priorité", () => {
    expect(detectPhase("C'est en ligne : https://garage.vercel.app")).toBe(
      "live",
    );
  });
  it("renvoie null si rien de net", () => {
    expect(detectPhase("bonjour")).toBeNull();
  });
});

describe("extractLiveUrl", () => {
  it("préfère une URL .vercel.app", () => {
    expect(
      extractLiveUrl("voilà http://x.com et https://garage-anglet.vercel.app/"),
    ).toBe("https://garage-anglet.vercel.app/");
  });
  it("retombe sur une URL http(s) quelconque", () => {
    expect(extractLiveUrl("dispo sur https://exemple.fr/site")).toBe(
      "https://exemple.fr/site",
    );
  });
  it("vide si aucune URL", () => {
    expect(extractLiveUrl("pas d'url ici")).toBe("");
  });
});

describe("assistantText", () => {
  it("concatène les blocs texte d'un event assistant", () => {
    const ev = {
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Je build " },
          { type: "tool_use", name: "x" },
          { type: "text", text: "la section hero" },
        ],
      },
    };
    expect(assistantText(ev)).toBe("Je build la section hero");
  });
  it("vide pour un autre type d'event", () => {
    expect(assistantText({ type: "result", subtype: "success" })).toBe("");
    expect(assistantText(null)).toBe("");
  });
});

describe("nextPhase (monotone)", () => {
  it("avance recherche → build → qa → deploy → live", () => {
    let p: Phase | null = null;
    p = nextPhase(p, "Je récupère la fiche Google et les avis");
    expect(p).toBe("recherche");
    p = nextPhase(p, "J'écris la section hero");
    expect(p).toBe("build");
    p = nextPhase(p, "Lancement de qa_check.py");
    expect(p).toBe("qa");
    p = nextPhase(p, "Mise en ligne sur Vercel");
    expect(p).toBe("deploy");
    p = nextPhase(p, "C'est en ligne : https://garage.vercel.app");
    expect(p).toBe("live");
  });

  it("ne recule JAMAIS : un log de construction après un déploiement garde deploy", () => {
    expect(nextPhase("deploy", "je réécris la section services")).toBe(
      "deploy",
    );
    expect(nextPhase("qa", "scaffold next + shadcn")).toBe("qa");
    expect(nextPhase("live", "Mise en ligne sur Vercel")).toBe("live");
  });

  it("garde la phase courante si le texte n'indique aucune phase", () => {
    expect(nextPhase("qa", "bonjour tout va bien")).toBe("qa");
    expect(nextPhase(null, "rien de net")).toBeNull();
  });

  it("démarre à la phase détectée quand current est null", () => {
    expect(nextPhase(null, "J'écris le composant")).toBe("build");
  });
});
