# Sans-Site Script Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the "sans-site" call angle a new script (permission-first, offers email/text choice) while `site-mort` and `reseaux` keep the existing script verbatim, by turning `CALL_STEPS` and `BON_OUI` into per-angle lookups instead of single shared values.

**Architecture:** `lib/call-script.ts` currently exports `CALL_STEPS: ScriptStep[]` and `BON_OUI: string`, shared by all angles. Both become `Record<Angle, ...>`. The `Angle` type (and `ANGLE_LABELS`/`ANGLE_PITCH`/`angleAppel`) move earlier in the file so `CALL_STEPS` can reference `Angle`. The two consumer components (`components/call-mode.tsx`, which already computes `angle`, and `components/script-panel.tsx`, which does not yet) index into these records by the prospect's computed angle instead of using the old flat values.

**Tech Stack:** TypeScript, React (function components), Vitest.

## Global Constraints

- `site-mort` and `reseaux` `CALL_STEPS` entries and `BON_OUI` text are copied verbatim from the current file — no wording changes to those two angles.
- `[Nom de l'entreprise]` in the user-provided sans-site script becomes `[entreprise]` (the token `fillScript` already substitutes); `(ton prénom)` stays exactly as written — it is not a bracket token and is not substituted by `fillScript`.
- Only the `"Envoyez-moi un courriel."` entry in `OBJECTIONS` changes (its `reponse` only); no other `OBJECTIONS` entries, `ANGLE_PITCH`, `ANGLE_LABELS`, or `SITE_MORT_TIP` change.
- `CALL_STEPS` keeps its export name; only its type changes from `ScriptStep[]` to `Record<Angle, ScriptStep[]>`. Same for `BON_OUI`: name stays, type changes from `string` to `Record<Angle, string>`.

---

### Task 1: Per-angle `CALL_STEPS` and `BON_OUI` in `lib/call-script.ts`, updated consumers and tests

**Files:**
- Modify: `lib/call-script.ts` (reorder `Angle`-related declarations before `CALL_STEPS`; change `CALL_STEPS` and `BON_OUI` to `Record<Angle, ...>`; fix one `OBJECTIONS` entry)
- Modify: `components/call-mode.tsx:161-167,199` (index `BON_OUI` and `CALL_STEPS` by `angle`)
- Modify: `components/script-panel.tsx` (compute `angle`, index `CALL_STEPS` by it)
- Test: `lib/call-script.test.ts`

**Interfaces:**
- Consumes: existing `Angle = "site-mort" | "reseaux" | "sans-site"`, `angleAppel(pourquoi: string): Angle`, `ScriptStep { titre: string; texte: string }` (all already defined in `lib/call-script.ts`, unchanged in shape).
- Produces: `CALL_STEPS: Record<Angle, ScriptStep[]>` and `BON_OUI: Record<Angle, string>` — every other file that imports `CALL_STEPS` or `BON_OUI` must index by an `Angle` key (`CALL_STEPS[angle]`, `BON_OUI[angle]`) rather than using them directly as an array/string.

- [ ] **Step 1: Write the failing test for per-angle `CALL_STEPS`**

Replace the full contents of `lib/call-script.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/call-script.test.ts`

Expected: FAIL — `CALL_STEPS` is still `ScriptStep[]`, so `CALL_STEPS["site-mort"]` etc. and `Object.values(CALL_STEPS)` produce type errors / wrong runtime shape (indexing a plain array by a string key returns `undefined`, and `.toHaveLength(5)` on `undefined` throws).

- [ ] **Step 3: Reorder `Angle` declarations before `CALL_STEPS` in `lib/call-script.ts`**

Move this whole block (currently at lines 56–81 of the file) so it appears immediately after the existing `ScriptStep` interface (currently lines 14–17) and before the current `CALL_STEPS` declaration:

```ts
// Angle d'appel (tracker, colonne « Angle d'appel ») : dérivé de la colonne
// Pourquoi du scoring, il dit quel pitch utiliser sur cette fiche.
export type Angle = "site-mort" | "reseaux" | "sans-site";

export const ANGLE_LABELS: Record<Angle, string> = {
  "site-mort": "Site à refaire",
  reseaux: "Réseaux seulement",
  "sans-site": "Sans site",
};

export const ANGLE_PITCH: Record<Angle, string> = {
  "site-mort":
    "Variante site mort : « j'ai cliqué sur le lien de votre fiche et ça tombe sur une erreur / ça fait daté ».",
  reseaux:
    "Pitch normal : une page Facebook n'est pas un site — quand on clique, rien derrière.",
  "sans-site":
    "Pitch normal : quand on tape votre nom sur Google, rien derrière.",
};

export function angleAppel(pourquoi: string): Angle {
  const p = (pourquoi || "").toLowerCase();
  if (/casse|cassé|domaine en vente|gratuit amateur|site mort|daté/.test(p))
    return "site-mort";
  if (/facebook|instagram|insta|réseau|reseau|\bfb\b/.test(p)) return "reseaux";
  return "sans-site";
}
```

Leave the block's content unchanged — only its position in the file moves. Do not leave a duplicate copy behind at the old location.

- [ ] **Step 4: Replace `CALL_STEPS` with the per-angle `Record`**

At the (now earlier) location where `CALL_STEPS` was originally declared, replace:

```ts
export const CALL_STEPS: ScriptStep[] = [
  {
    titre: "1 · Le hook",
    texte:
      "Bonjour, je suis bien chez [entreprise] ? Si je vous dis que c'est un appel de prospection, vous jetez votre téléphone par la fenêtre, ou vous me laissez trente secondes ?",
  },
  {
    titre: "2 · Le retournement",
    texte:
      "J'imagine qu'on vous appelle souvent pour vous vendre un site. Moi c'est différent. Je me suis permis de vous en créer un, il existe déjà.",
  },
  {
    titre: "3 · La proposition zéro risque",
    texte:
      "Ça n'engage à rien, je vous l'envoie en fin d'après-midi, vous regardez deux minutes ce soir, et si ça ne vous plaît pas on en reste là.",
  },
  {
    titre: "4 · Le verrouillage",
    texte:
      "Je vous l'envoie sur ce numéro ? Parfait. Et je vous rappelle demain pour avoir votre retour à chaud, plutôt le matin ou l'après-midi ?",
  },
  {
    titre: "5 · La sortie",
    texte:
      "Super, vous recevez le lien avant 18h. Très bonne journée, et à demain.",
  },
];
```

with:

```ts
export const CALL_STEPS: Record<Angle, ScriptStep[]> = {
  "site-mort": [
    {
      titre: "1 · Le hook",
      texte:
        "Bonjour, je suis bien chez [entreprise] ? Si je vous dis que c'est un appel de prospection, vous jetez votre téléphone par la fenêtre, ou vous me laissez trente secondes ?",
    },
    {
      titre: "2 · Le retournement",
      texte:
        "J'imagine qu'on vous appelle souvent pour vous vendre un site. Moi c'est différent. Je me suis permis de vous en créer un, il existe déjà.",
    },
    {
      titre: "3 · La proposition zéro risque",
      texte:
        "Ça n'engage à rien, je vous l'envoie en fin d'après-midi, vous regardez deux minutes ce soir, et si ça ne vous plaît pas on en reste là.",
    },
    {
      titre: "4 · Le verrouillage",
      texte:
        "Je vous l'envoie sur ce numéro ? Parfait. Et je vous rappelle demain pour avoir votre retour à chaud, plutôt le matin ou l'après-midi ?",
    },
    {
      titre: "5 · La sortie",
      texte:
        "Super, vous recevez le lien avant 18h. Très bonne journée, et à demain.",
    },
  ],
  reseaux: [
    {
      titre: "1 · Le hook",
      texte:
        "Bonjour, je suis bien chez [entreprise] ? Si je vous dis que c'est un appel de prospection, vous jetez votre téléphone par la fenêtre, ou vous me laissez trente secondes ?",
    },
    {
      titre: "2 · Le retournement",
      texte:
        "J'imagine qu'on vous appelle souvent pour vous vendre un site. Moi c'est différent. Je me suis permis de vous en créer un, il existe déjà.",
    },
    {
      titre: "3 · La proposition zéro risque",
      texte:
        "Ça n'engage à rien, je vous l'envoie en fin d'après-midi, vous regardez deux minutes ce soir, et si ça ne vous plaît pas on en reste là.",
    },
    {
      titre: "4 · Le verrouillage",
      texte:
        "Je vous l'envoie sur ce numéro ? Parfait. Et je vous rappelle demain pour avoir votre retour à chaud, plutôt le matin ou l'après-midi ?",
    },
    {
      titre: "5 · La sortie",
      texte:
        "Super, vous recevez le lien avant 18h. Très bonne journée, et à demain.",
    },
  ],
  "sans-site": [
    {
      titre: "1 · Le hook",
      texte:
        "Salut, c'est (ton prénom) de Ghaflow. Je vous appelle pour [entreprise]. On va être ben rapides, est-ce que vous avez 20 secondes ?",
    },
    {
      titre: "2 · La raison de l'appel",
      texte:
        "On vous appelle parce qu'on a remarqué que vous n'avez pas de site web en ce moment. Souvent, ça fait en sorte que des clients vous cherchent, mais ne trouvent pas d'info claire ou ne prennent juste pas le temps d'aller plus loin.",
    },
    {
      titre: "3 · La proposition",
      texte:
        "Chez Ghaflow, on aide justement des entreprises comme la vôtre à se faire un site simple, propre, pas compliqué, juste pour bien vous présenter et permettre aux gens de vous contacter facilement.",
    },
    {
      titre: "4 · Le verrouillage + choix du canal",
      texte:
        "Est-ce que c'est un sujet que vous seriez ouverts à regarder ? Si oui, on peut vous préparer un petit exemple concret de ce que ça pourrait donner pour votre entreprise, puis vous l'envoyer. Vous préférez qu'on vous l'envoie par courriel ou par texto ? (Courriel) Parfait, quel est le meilleur courriel pour vous joindre ? (Texte) Parfait, on vous envoie ça sur ce numéro-là, ça vous convient ?",
    },
    {
      titre: "5 · La sortie",
      texte:
        "Excellent, on vous envoie ça, puis on se reparle après que vous l'ayez vu. Si vous voyez que ce n'est pas pour vous, il n'y a pas de problème, vous décidez.",
    },
  ],
};
```

- [ ] **Step 5: Replace `BON_OUI` with the per-angle `Record`**

Replace:

```ts
// Ce qui compte comme un bon OUI (tracker, feuille Script). À garder en tête au
// moment de cliquer OUI : sans créneau de rappel, ce n'est pas un vrai OUI.
export const BON_OUI =
  "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».";
```

with:

```ts
// Ce qui compte comme un bon OUI (tracker, feuille Script), par angle — à
// garder en tête au moment de cliquer OUI.
export const BON_OUI: Record<Angle, string> = {
  "site-mort":
    "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».",
  reseaux:
    "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».",
  "sans-site":
    "Un bon OUI = il accepte de recevoir l'exemple ET il donne un courriel valide ou confirme que le texto sur ce numéro lui convient. Un « ouais, envoyez ça » vague sans courriel précis ni confirmation ne compte pas : pousse gentiment pour l'info exacte, sinon mets « À rappeler ».",
};
```

- [ ] **Step 6: Fix the "Envoyez-moi un courriel." objection response**

In the `OBJECTIONS` array, replace:

```ts
  {
    question: "Envoyez-moi un courriel.",
    reponse:
      "Je peux faire mieux. Ce soir vous recevez le site fini, directement sur ce numéro. Vous jugez sur pièce, ça vaut tous les dépliants du monde.",
  },
```

with:

```ts
  {
    question: "Envoyez-moi un courriel.",
    reponse:
      "Parfait, c'est justement une des deux options qu'on offre. Quel est le meilleur courriel pour vous joindre ?",
  },
```

- [ ] **Step 7: Run test to verify `lib/call-script.test.ts` passes**

Run: `npx vitest run lib/call-script.test.ts`

Expected: PASS — all tests green.

- [ ] **Step 8: Update `components/call-mode.tsx` to index by `angle`**

`angle` is already computed at `const angle = angleAppel(prospect.pourquoi);`. Change:

```tsx
              {BON_OUI}
```

to:

```tsx
              {BON_OUI[angle]}
```

and change:

```tsx
            {CALL_STEPS.map((s) => (
```

to:

```tsx
            {CALL_STEPS[angle].map((s) => (
```

(The rest of that `.map(...)` block, and every other line in the file, is unchanged.)

- [ ] **Step 9: Update `components/script-panel.tsx` to compute and use `angle`**

Read the current `components/script-panel.tsx` first (it does not compute an angle today). Change the import line:

```tsx
import { CALL_STEPS, OBJECTIONS, fillScript } from "@/lib/call-script";
```

to:

```tsx
import { CALL_STEPS, OBJECTIONS, fillScript, angleAppel } from "@/lib/call-script";
```

Inside the component body, immediately after the existing `vars` object is built (right after the `const vars = { ... };` block), add:

```tsx
  const angle = angleAppel(current?.pourquoi ?? "");
```

Then change:

```tsx
              {CALL_STEPS.map((s) => (
```

to:

```tsx
              {CALL_STEPS[angle].map((s) => (
```

- [ ] **Step 10: Run full test suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`

Expected: all test files pass except the pre-existing unrelated failure in `scripts/build-lead.integration.test.ts` (a process-signal integration test unrelated to this change — confirm it is the *same* failure as before this task, not a new one). No new TypeScript errors (confirms no other file still uses `CALL_STEPS` or `BON_OUI` as a flat array/string).

- [ ] **Step 11: Commit**

```bash
git add lib/call-script.ts lib/call-script.test.ts components/call-mode.tsx components/script-panel.tsx
git commit -m "feat: give sans-site call angle its own script, split CALL_STEPS/BON_OUI by angle"
```

---

## Self-Review Notes

- Spec coverage: per-angle `CALL_STEPS` ✓ (Steps 3-4), per-angle `BON_OUI` ✓ (Step 5), objection fix ✓ (Step 6), `call-mode.tsx` consumer update ✓ (Step 8), `script-panel.tsx` consumer update including angle computation for a possibly-null `current` ✓ (Step 9), test restructuring ✓ (Step 1), verbatim site-mort/reseaux content ✓ (copied unchanged into Steps 4-5), `[Nom de l'entreprise]` → `[entreprise]` and `(ton prénom)` left literal ✓ (in the sans-site block in Step 4).
- No placeholders — every step has full code, including the reorder step's exact block content.
- Single task was sufficient: this is one file's internal restructuring plus two small, mechanical consumer updates, all covered by the same test cycle (`lib/call-script.test.ts` exercises the shared data; the two component changes are one-line-each index additions with no independent logic to test).
