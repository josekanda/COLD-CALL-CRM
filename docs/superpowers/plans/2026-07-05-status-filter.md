# Filtre par statut sur la colonne "Statut" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de filtrer les prospects par statut directement depuis un `<select>` dans l'en-tête de la colonne "Statut" du tableau, en plus des chips existants de la Toolbar — les deux pilotant le même état de filtre.

**Architecture:** `ProspectTable` reçoit deux nouvelles props (`filter`, `onFilter`) déjà détenues par `app/page.tsx`, sans nouvel état. Le `<th>` "Statut" contient un `<select>` lié à ce même état. La Toolbar gagne un chip manquant pour le statut `"refus"`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest + @testing-library/react + jsdom (déjà configurés, voir [vitest.config.ts](../../../vitest.config.ts)).

## Global Constraints

- Réutiliser intégralement le type `Filter` existant (`components/toolbar.tsx`) et le state `filter`/`setFilter` déjà en place dans `app/page.tsx` — aucun nouveau type, aucun nouvel état global.
- Sélection unique (pas de multi-statuts).
- Quand `filter` vaut `"rappel"` ou `"upsell"` (chips spéciaux sans `Status` correspondant), le `<select>` de la colonne doit afficher `"all"` par défaut plutôt que planter ou afficher une valeur invalide.
- Pas de changement à la logique de tri/recherche existante dans `app/page.tsx`.

---

### Task 1: Ajouter le chip "Pas intéressé" à la Toolbar

**Files:**
- Modify: `components/toolbar.tsx:14-22`

**Interfaces:**
- Consumes: rien de nouveau — `Filter` et `CHIPS` existent déjà dans ce fichier.
- Produces: rien de nouveau consommé ailleurs — cette entrée `CHIPS` est déjà couverte par la boucle de rendu existante (`CHIPS.map`) et par la logique de filtrage déjà présente dans `app/page.tsx:56` (`p.status === filter`).

Ce composant n'a pas de test dédié existant et son rendu ne dépend d'aucune logique conditionnelle nouvelle (juste une entrée de tableau statique) — pas de test unitaire requis pour ce changement, cohérent avec le reste du fichier.

- [ ] **Step 1: Ajouter l'entrée dans `CHIPS`**

Dans `components/toolbar.tsx`, modifier le tableau `CHIPS` :

```ts
const CHIPS: { f: Filter; label: string; icon?: LucideIcon }[] = [
  { f: "all", label: "Tous" },
  { f: "a_appeler", label: "À appeler" },
  { f: "rappel", label: "À rappeler aujourd'hui", icon: Bell },
  { f: "rdv", label: "RDV" },
  { f: "qualifie", label: "OUI · à construire" },
  { f: "construit", label: "Construits" },
  { f: "refus", label: "Pas intéressé" },
  { f: "upsell", label: "Upsell en cours", icon: BadgeEuro },
];
```

(seule l'entrée `{ f: "refus", label: "Pas intéressé" }` est nouvelle, insérée après `"construit"` et avant `"upsell"`).

- [ ] **Step 2: Vérifier visuellement**

Run: `npm run dev`, ouvrir l'app, importer/charger l'exemple de données (bouton "Voir un exemple"), vérifier que le chip "Pas intéressé" apparaît dans la Toolbar et qu'un clic dessus filtre bien le tableau aux prospects de statut `refus`.

- [ ] **Step 3: Commit**

```bash
git add components/toolbar.tsx
git commit -m "feat: add missing 'Pas intéressé' status filter chip"
```

---

### Task 2: Select de filtre dans l'en-tête de la colonne Statut

**Files:**
- Modify: `components/prospect-table.tsx:1-70` (imports, signature de `ProspectTable`, `<th>` "Statut")
- Modify: `app/page.tsx:123-131` (props passées à `<ProspectTable>`)
- Test: `components/prospect-table.test.tsx` (nouveau fichier)

**Interfaces:**
- Consumes: `Filter` (type, exporté depuis `components/toolbar.tsx`), `STATUSES` (`Record<Status, string>`, exporté depuis `lib/types.ts`), state existant `filter: Filter` et `setFilter: (f: Filter) => void` dans `app/page.tsx` (déjà déclarés via `useState<Filter>("all")` à la ligne 26).
- Produces: `ProspectTable` expose deux nouvelles props obligatoires `filter: Filter` et `onFilter: (f: Filter) => void`. Tout appelant existant de `<ProspectTable>` doit les fournir (seul appelant : `app/page.tsx`).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `components/prospect-table.test.tsx` :

```tsx
import { describe, it, expect, vi } from "vitest";
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
      />,
    );
    fireEvent.change(screen.getByLabelText("Filtrer par statut"), {
      target: { value: "refus" },
    });
    expect(onFilter).toHaveBeenCalledWith("refus");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/prospect-table.test.tsx`
Expected: FAIL — `ProspectTable` ne fournit pas encore les props `filter`/`onFilter`, et `getByLabelText("Filtrer par statut")` ne trouve aucun élément (le `<th>` "Statut" ne contient qu'un texte brut, pas de `<select>`).

- [ ] **Step 3: Implémenter — `components/prospect-table.tsx`**

Ajouter `Filter` aux imports en haut du fichier (après les imports existants de `lucide-react`) :

```tsx
import type { Filter } from "@/components/toolbar";
```

Étendre la signature de `ProspectTable` (remplacer le bloc de props actuel, lignes ~30-42) :

```tsx
export function ProspectTable({
  prospects,
  cal,
  onUpdate,
  onStatus,
  onToast,
  filter,
  onFilter,
}: {
  prospects: Prospect[];
  cal: string;
  onUpdate: (id: string, patch: Partial<Prospect>) => void;
  onStatus: (id: string, s: Status) => void;
  onToast: (msg: string) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
```

Remplacer le `<th className="px-4 py-3">Statut</th>` (ligne ~62) par :

```tsx
<th className="px-4 py-3">
  <label className="flex items-center gap-1.5">
    Statut
    <select
      aria-label="Filtrer par statut"
      value={
        filter === "all" || filter in STATUSES ? filter : "all"
      }
      onChange={(e) => onFilter(e.target.value as Filter)}
      className="rounded-lg border border-input bg-background px-1.5 py-0.5 text-xs font-normal normal-case"
    >
      <option value="all">Tous les statuts</option>
      {Object.entries(STATUSES).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  </label>
</th>
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/prospect-table.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Câbler dans `app/page.tsx`**

Dans `app/page.tsx`, sur le bloc qui rend `<ProspectTable>` (lignes ~123-131), ajouter les deux props :

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
  />
)}
```

- [ ] **Step 6: Vérifier le typecheck et l'ensemble des tests**

Run: `npx tsc --noEmit`
Expected: aucune erreur (en particulier, plus d'erreur "prop manquante" sur `<ProspectTable>`).

Run: `npm run test`
Expected: tous les tests passent, y compris les 3 nouveaux et `lib/prospect.test.ts`.

- [ ] **Step 7: Vérifier visuellement**

Run: `npm run dev`, ouvrir l'app, charger l'exemple de données. Vérifier que :
- le select dans l'en-tête "Statut" affiche "Tous les statuts" par défaut,
- le choisir sur un statut filtre le tableau et active le chip correspondant dans la Toolbar,
- cliquer un chip dans la Toolbar met à jour le select en retour (sauf pour "À rappeler aujourd'hui" et "Upsell en cours", qui retombent sur "Tous les statuts" dans le select — comportement attendu).

- [ ] **Step 8: Commit**

```bash
git add components/prospect-table.tsx components/prospect-table.test.tsx app/page.tsx
git commit -m "feat: add status filter select to prospect table header"
```
