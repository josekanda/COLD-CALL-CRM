# Suppression d'un prospect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de supprimer un prospect individuel, avec confirmation, depuis le tableau principal et depuis le Mode appel.

**Architecture:** Une nouvelle fonction `removeProspect(id)` dans la couche store existante, exposée par le hook `useCrm()` sous le nom `remove`, puis passée en prop `onRemove` aux deux composants qui affichent un prospect individuel (`ProspectTable`, `CallMode`). Chaque composant gère sa propre confirmation (`window.confirm`) avant d'appeler `onRemove`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest + @testing-library/react + jsdom (déjà configurés, voir [vitest.config.ts](../../../vitest.config.ts)).

## Global Constraints

- Aucun nouvel état global : `onRemove` est une prop dérivée du `useCrm()` déjà en place dans `app/page.tsx`.
- La suppression est irréversible (pas de corbeille) : chaque point d'entrée doit appeler `window.confirm("Supprimer définitivement \"<entreprise>\" ?")` et ne procéder que si l'utilisateur confirme.
- Dans le Mode appel, le bouton de suppression doit être visuellement distinct des 4 boutons d'action d'appel (Pas joint / À rappeler / Non / OUI) — un lien texte discret sous la grille, pas un 5ᵉ bouton de même poids, pour éviter les clics accidentels pendant le flux d'appel.
- Couleurs destructives : utiliser les tokens `destructive` déjà définis dans le design system (`text-destructive`, `bg-destructive/10`, `border-destructive/40` — déjà utilisés dans `components/build-queue.tsx` et `components/scrape-bar.tsx`), pas de couleur ad hoc.
- Pas de test dédié pour `removeProspect`/`crm-store.ts` (cohérent avec l'absence de tests sur les fonctions voisines de ce fichier — `updateProspect`, `resetProspects`, etc. n'en ont pas non plus).

---

### Task 1: Couche données — `removeProspect`

**Files:**
- Modify: `lib/crm-store.ts` (ajoute une fonction, ne modifie aucune fonction existante)
- Modify: `hooks/use-crm.ts:15-26`

**Interfaces:**
- Consumes: `getSnapshot()`, `commit(next: AppState)` (déjà définis dans `lib/crm-store.ts`), type `AppState` (déjà importé dans ce fichier).
- Produces: `removeProspect(id: string): void`, exporté depuis `lib/crm-store.ts`. Exposé par `useCrm()` sous la clé `remove: (id: string) => void` — Task 2 et Task 3 en dépendent pour câbler `onRemove` dans `app/page.tsx`.

- [ ] **Step 1: Ajouter `removeProspect` dans `lib/crm-store.ts`**

Ouvrir `lib/crm-store.ts`. Après la fonction `resetProspects` (fin de fichier, après la ligne `}` qui la termine), ajouter :

```ts
export function removeProspect(id: string) {
  const cur = getSnapshot();
  commit({ ...cur, prospects: cur.prospects.filter((p) => p.id !== id) });
}
```

- [ ] **Step 2: Exposer `remove` dans `hooks/use-crm.ts`**

Remplacer le contenu de `hooks/use-crm.ts` par :

```ts
"use client";
import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  importCsv,
  loadExample,
  updateProspect,
  setStatus,
  setCal,
  resetProspects,
  removeProspect,
} from "@/lib/crm-store";

export function useCrm() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    state,
    importCsv,
    loadExample,
    update: updateProspect,
    setStatus,
    setCal,
    reset: resetProspects,
    remove: removeProspect,
  };
}
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur (le hook n'est pas encore consommé avec `remove` ailleurs, donc rien ne doit casser).

- [ ] **Step 4: Commit**

```bash
git add lib/crm-store.ts hooks/use-crm.ts
git commit -m "feat: add removeProspect to the CRM store and useCrm hook"
```

---

### Task 2: Bouton Supprimer dans le tableau principal

**Files:**
- Modify: `components/prospect-table.tsx:15-22` (imports lucide-react), `:31-47` (props), `:283-294` (cellule Actions)
- Modify: `app/page.tsx:23-25` (destructure du hook), `:123-133` (rendu de `<ProspectTable>`)
- Test: `components/prospect-table.test.tsx` (fichier existant, étendu)

**Interfaces:**
- Consumes: `remove: (id: string) => void` exposé par `useCrm()` (Task 1).
- Produces: `ProspectTable` expose une nouvelle prop obligatoire `onRemove: (id: string) => void`. `app/page.tsx` destructure désormais `remove` depuis `useCrm()` — Task 3 réutilise cette même variable pour câbler `onRemove` sur `<CallMode>`, ne la re-déclare pas.

- [ ] **Step 1: Écrire les tests qui échouent**

Remplacer le contenu de `components/prospect-table.test.tsx` par :

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProspectTable } from "./prospect-table";
import type { Prospect } from "@/lib/types";

const p = (over: Partial<Prospect>): Prospect => ({
  id: "x",
  entreprise: "Debowski Paysage",
  ville: "Le Bouscat",
  activite: "",
  tel: "06 12 34 56 78",
  note: "",
  nbAvis: "",
  score: "47",
  pourquoi: "",
  lienFiche: "",
  status: "a_appeler",
  notes: "",
  rappelLe: null,
  montant: null,
  siteUrl: "",
  placeId: "",
  upsell: "aucun",
  ...over,
});

const noop = () => {};

describe("ProspectTable — filtre statut", () => {
  it("affiche un select de statut dans l'en-tête, initialisé sur la valeur de filter", () => {
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="qualifie"
        onFilter={noop}
        onRemove={noop}
      />,
    );
    const select = screen.getByLabelText("Filtrer par statut");
    expect(select).toHaveValue("qualifie");
  });

  it("retombe sur 'all' quand filter est un chip spécial (rappel/upsell)", () => {
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="rappel"
        onFilter={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByLabelText("Filtrer par statut")).toHaveValue("all");
  });

  it("appelle onFilter avec le statut choisi", () => {
    const onFilter = vi.fn();
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="all"
        onFilter={onFilter}
        onRemove={noop}
      />,
    );
    fireEvent.change(screen.getByLabelText("Filtrer par statut"), {
      target: { value: "refus" },
    });
    expect(onFilter).toHaveBeenCalledWith("refus");
  });
});

describe("ProspectTable — suppression", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle onRemove avec l'id du prospect quand la confirmation est acceptée", () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const onRemove = vi.fn();
    render(
      <ProspectTable
        prospects={[p({ id: "abc" })]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="all"
        onFilter={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(window.confirm).toHaveBeenCalledWith(
      'Supprimer définitivement "Debowski Paysage" ?',
    );
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("n'appelle pas onRemove quand la confirmation est refusée", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const onRemove = vi.fn();
    render(
      <ProspectTable
        prospects={[p({ id: "abc" })]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="all"
        onFilter={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/prospect-table.test.tsx`
Expected: FAIL — les 3 premiers tests échouent au typecheck/render car `onRemove` n'existe pas encore sur `ProspectTable` ; les 2 nouveaux tests échouent avec `Unable to find role="button" with name "Supprimer"`.

- [ ] **Step 3: Implémenter — `components/prospect-table.tsx`**

Remplacer le bloc d'imports `lucide-react` (lignes 15-22) par :

```tsx
import {
  Phone,
  CalendarClock,
  Check,
  Globe,
  MessageSquare,
  Star,
  Trash2,
} from "lucide-react";
```

Remplacer la signature de `ProspectTable` (lignes 31-47) par :

```tsx
export function ProspectTable({
  prospects,
  cal,
  onUpdate,
  onStatus,
  onToast,
  filter,
  onFilter,
  onRemove,
}: {
  prospects: Prospect[];
  cal: string;
  onUpdate: (id: string, patch: Partial<Prospect>) => void;
  onStatus: (id: string, s: Status) => void;
  onToast: (msg: string) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onRemove: (id: string) => void;
}) {
```

Dans la cellule Actions, juste après le bouton "A dit OUI" (après la ligne `<Check className="size-3" aria-hidden />A dit OUI` et son `</button>` fermant, lignes 283-294), ajouter un nouveau bouton :

```tsx
                    <button
                      onClick={() => {
                        if (
                          !confirm(
                            `Supprimer définitivement "${p.entreprise}" ?`,
                          )
                        )
                          return;
                        onRemove(p.id);
                        onToast("Prospect supprimé");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-2 py-1 text-xs font-semibold"
                    >
                      <Trash2 className="size-3" aria-hidden />
                      Supprimer
                    </button>
```

(inséré avant le `</div>` qui ferme le conteneur `flex flex-wrap gap-1` de la cellule Actions).

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run components/prospect-table.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Câbler dans `app/page.tsx`**

Remplacer la ligne de destructuration du hook (lignes 23-25) par :

```tsx
  const {
    state,
    importCsv,
    loadExample,
    update,
    setStatus,
    setCal,
    reset,
    remove,
  } = useCrm();
```

Remplacer le bloc `<ProspectTable>` (lignes 123-133) par :

```tsx
      {!isEmpty && (
        <ProspectTable
          prospects={visible}
          cal={state.cal}
          onUpdate={update}
          onStatus={setStatus}
          onToast={showToast}
          filter={filter}
          onFilter={setFilter}
          onRemove={remove}
        />
      )}
```

- [ ] **Step 6: Vérifier le typecheck et l'ensemble des tests**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run test`
Expected: tous les tests passent sauf le pré-existant `scripts/build-lead.integration.test.ts` (échec connu et sans rapport, présent avant ce travail).

- [ ] **Step 7: Vérifier visuellement**

Run: `npm run dev`, ouvrir l'app, charger l'exemple de données. Vérifier que le bouton "Supprimer" (rouge/destructif) apparaît dans la colonne Actions de chaque ligne, qu'un clic ouvre une confirmation native, et qu'accepter retire bien le prospect du tableau.

- [ ] **Step 8: Commit**

```bash
git add components/prospect-table.tsx components/prospect-table.test.tsx app/page.tsx
git commit -m "feat: add delete button to the prospect table"
```

---

### Task 3: Lien Supprimer dans le Mode appel

**Files:**
- Modify: `components/call-mode.tsx:2-10` (imports lucide-react), `:24-36` (props), `:139-146` (sous le paragraphe BON_OUI)
- Modify: `app/page.tsx:153-161` (rendu de `<CallMode>`)
- Test: `components/call-mode.test.tsx` (nouveau fichier)

**Interfaces:**
- Consumes: `remove: (id: string) => void`, déjà destructuré depuis `useCrm()` dans `app/page.tsx` par la Task 2 — ne pas re-déclarer, réutiliser tel quel.
- Produces: `CallMode` expose une nouvelle prop obligatoire `onRemove: (id: string) => void`. Aucun autre composant ne consomme `CallMode`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `components/call-mode.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CallMode } from "./call-mode";
import type { Prospect } from "@/lib/types";

const p = (over: Partial<Prospect>): Prospect => ({
  id: "x",
  entreprise: "Debowski Paysage",
  ville: "Le Bouscat",
  activite: "",
  tel: "06 12 34 56 78",
  note: "",
  nbAvis: "",
  score: "47",
  pourquoi: "",
  lienFiche: "",
  status: "a_appeler",
  notes: "",
  rappelLe: null,
  montant: null,
  siteUrl: "",
  placeId: "",
  upsell: "aucun",
  ...over,
});

const noop = () => {};

describe("CallMode — suppression", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle onRemove avec l'id du prospect quand la confirmation est acceptée", () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const onRemove = vi.fn();
    render(
      <CallMode
        prospect={p({ id: "abc" })}
        restants={1}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Supprimer ce prospect/ }),
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Supprimer définitivement "Debowski Paysage" ?',
    );
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("n'appelle pas onRemove quand la confirmation est refusée", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const onRemove = vi.fn();
    render(
      <CallMode
        prospect={p({ id: "abc" })}
        restants={1}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Supprimer ce prospect/ }),
    );
    expect(onRemove).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/call-mode.test.tsx`
Expected: FAIL — `CallMode` n'accepte pas encore `onRemove` et aucun bouton "Supprimer ce prospect" n'existe.

- [ ] **Step 3: Implémenter — `components/call-mode.tsx`**

Remplacer le bloc d'imports `lucide-react` (lignes 2-10) par :

```tsx
import {
  Phone,
  PhoneOff,
  CalendarClock,
  X,
  Check,
  PartyPopper,
  Lightbulb,
  Trash2,
} from "lucide-react";
```

Remplacer la signature de `CallMode` (lignes 24-36) par :

```tsx
export function CallMode({
  prospect,
  restants,
  onStatus,
  onClose,
  onToast,
  onRemove,
}: {
  prospect: Prospect | null;
  restants: number;
  onStatus: (id: string, s: Status) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
  onRemove: (id: string) => void;
}) {
```

Juste après le paragraphe `BON_OUI` et avant le `</div>` qui ferme la carte de gauche (lignes 139-146) :

```tsx
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Check
                className="size-3.5 shrink-0 mt-0.5 text-primary"
                aria-hidden
              />
              {BON_OUI}
            </p>
            <button
              onClick={() => {
                if (
                  !confirm(`Supprimer définitivement "${prospect.entreprise}" ?`)
                )
                  return;
                onRemove(prospect.id);
                onToast("Prospect supprimé");
              }}
              className="mt-3 flex items-center justify-center gap-1 mx-auto text-xs text-destructive underline-offset-2 hover:underline"
            >
              <Trash2 className="size-3" aria-hidden />
              Supprimer ce prospect
            </button>
          </div>
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/call-mode.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Câbler dans `app/page.tsx`**

Remplacer le bloc `<CallMode>` (lignes 153-161) par :

```tsx
      {callMode && (
        <CallMode
          prospect={prochain}
          restants={aAppeler.length}
          onStatus={setStatus}
          onClose={() => setCallMode(false)}
          onToast={showToast}
          onRemove={remove}
        />
      )}
```

- [ ] **Step 6: Vérifier le typecheck et l'ensemble des tests**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run test`
Expected: tous les tests passent sauf le pré-existant `scripts/build-lead.integration.test.ts` (échec connu et sans rapport).

- [ ] **Step 7: Vérifier visuellement**

Run: `npm run dev`, ouvrir l'app, charger l'exemple de données, cliquer "Appeler le prochain" pour entrer en Mode appel. Vérifier que le lien "Supprimer ce prospect" apparaît sous le bloc d'actions d'appel, qu'un clic ouvre une confirmation native, et qu'accepter retire le prospect et fait automatiquement passer au suivant (ou affiche "Plus personne à appeler" s'il n'y en a plus).

- [ ] **Step 8: Commit**

```bash
git add components/call-mode.tsx components/call-mode.test.tsx app/page.tsx
git commit -m "feat: add delete link to Call Mode"
```
