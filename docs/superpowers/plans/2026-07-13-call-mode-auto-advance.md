# Call Mode Auto-Advance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Call Mode, "Pas joint" advances to the next prospect (sending the current one to the back of the queue for this session only), and "Non" deletes the prospect outright instead of tagging it "refus".

**Architecture:** `CallMode` currently receives a single already-computed `prospect` prop from `app/page.tsx`. It will instead receive the full `queue` of `a_appeler` prospects (sorted by score, same array `page.tsx` already computes as `aAppeler`) and compute which one to display itself, using local `skipped` state to reorder the queue for "Pas joint". Because `CallMode` is only mounted while the modal is open, this local state resets automatically on every reopen.

**Tech Stack:** React (function components, `useState`), TypeScript, Vitest + Testing Library.

## Global Constraints

- No `confirm()` popup on "Non" — direct deletion (per spec `docs/superpowers/specs/2026-07-13-call-mode-auto-advance-design.md`).
- `skipped` state is local to `CallMode`, not persisted to the store or `localStorage`.
- "À rappeler" and "OUI" buttons are unchanged.
- `restants` shown to the user stays the total count of `a_appeler` prospects (`queue.length`), unaffected by skip ordering.

---

### Task 1: `CallMode` accepts `queue` instead of `prospect` and computes display order

**Files:**
- Modify: `components/call-mode.tsx:25-73` (props signature, prospect derivation, "Pas joint" and "Non" button handlers)
- Modify: `app/page.tsx:163-171` (pass `queue={aAppeler}` instead of `prospect={prochain}`)
- Test: `components/call-mode.test.tsx`

**Interfaces:**
- Consumes: `Prospect`, `Status` from `@/lib/types` (already imported in `call-mode.tsx`).
- Produces: `CallMode` component signature becomes
  ```ts
  {
    queue,
    restants,
    onStatus,
    onClose,
    onToast,
    onRemove,
  }: {
    queue: Prospect[];
    restants: number;
    onStatus: (id: string, s: Status) => void;
    onClose: () => void;
    onToast: (msg: string) => void;
    onRemove: (id: string) => void;
  }
  ```
  This is the shape every later task (and `app/page.tsx`) must use.

- [ ] **Step 1: Write the failing test for queue-based "Pas joint" advancing**

Replace the full contents of `components/call-mode.test.tsx` with:

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
        queue={[p({ id: "abc" })]}
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
        queue={[p({ id: "abc" })]}
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

describe("CallMode — file d'appel", () => {
  it("affiche le premier prospect de la file", () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
        ]}
        restants={2}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it('"Pas joint" affiche le prospect suivant de la file', () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
          p({ id: "3", entreprise: "Gamma" }),
        ]}
        restants={3}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it('skipper tout le monde reboucle sur le premier skippé', () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
        ]}
        restants={2}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ })); // skip Alpha -> Beta
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ })); // skip Beta -> back to Alpha
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it('"Non" appelle onRemove sans confirmation et n\'appelle pas onStatus', () => {
    const onRemove = vi.fn();
    const onStatus = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <CallMode
        queue={[p({ id: "1", entreprise: "Alpha" })]}
        restants={1}
        onStatus={onStatus}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Non" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith("1");
    expect(onStatus).not.toHaveBeenCalledWith("1", "refus");
    confirmSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/call-mode.test.tsx`

Expected: FAIL — `CallMode` still expects a `prospect` prop, so `queue={[...]}` renders nothing where `screen.getByText("Alpha")` etc. expect content (component currently renders "Plus personne à appeler" since `prospect` is undefined), and the "Non" test fails because there's no button with accessible name exactly `"Non"` behavior calling `onRemove`.

- [ ] **Step 3: Implement `queue` prop, skip state, and updated button handlers**

In `components/call-mode.tsx`, replace lines 25–73 (the function signature through the `act` helper) with:

```tsx
import { useState } from "react";

export function CallMode({
  queue,
  restants,
  onStatus,
  onClose,
  onToast,
  onRemove,
}: {
  queue: Prospect[];
  restants: number;
  onStatus: (id: string, s: Status) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
  onRemove: (id: string) => void;
}) {
  const [skipped, setSkipped] = useState<string[]>([]);

  const skippedSet = new Set(skipped);
  const front = queue.filter((p) => !skippedSet.has(p.id));
  const back = skipped
    .map((id) => queue.find((p) => p.id === id))
    .filter((p): p is Prospect => !!p);
  const prospect = [...front, ...back][0] ?? null;

  if (!prospect) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 inline-flex items-center gap-2">
            <PartyPopper className="size-6 text-primary" aria-hidden />
            Plus personne à appeler
          </div>
          <div className="text-muted-foreground mb-4">
            Tous les prospects ont un statut. Importe une nouvelle liste ou
            passe au build.
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-semibold"
          >
            Retour au CRM
          </button>
        </div>
      </div>
    );
  }
  const vars = {
    entreprise: prospect.entreprise,
    ville: prospect.ville,
    activite: prospect.activite,
  };
  const fiche = safeHttpUrl(prospect.lienFiche);
  const angle = angleAppel(prospect.pourquoi);
  const siteMort = angle === "site-mort";
  const act = (s: Status, msg: string) => {
    onStatus(prospect.id, s);
    onToast(msg);
  };
  const passJoint = () => {
    onStatus(prospect.id, "a_appeler");
    setSkipped((prev) => [...prev, prospect.id]);
    onToast("Pas joint — reste à appeler");
  };
  const non = () => {
    onRemove(prospect.id);
    onToast("Rayé");
  };
```

Add `import { useState } from "react";` at the top of the file (after the `"use client";` line, before the `lucide-react` import) instead of inline above — place it as the first import line.

Then update the two buttons ([components/call-mode.tsx:114-133] in the original file) from:

```tsx
              <button
                onClick={() => act("a_appeler", "Pas joint — reste à appeler")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <PhoneOff className="size-4" aria-hidden />
                Pas joint
              </button>
              <button
                onClick={() => act("rdv", "Rappel calé")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <CalendarClock className="size-4" aria-hidden />À rappeler
              </button>
              <button
                onClick={() => act("refus", "Rayé")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <X className="size-4" aria-hidden />
                Non
              </button>
```

to:

```tsx
              <button
                onClick={passJoint}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <PhoneOff className="size-4" aria-hidden />
                Pas joint
              </button>
              <button
                onClick={() => act("rdv", "Rappel calé")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <CalendarClock className="size-4" aria-hidden />À rappeler
              </button>
              <button
                onClick={non}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <X className="size-4" aria-hidden />
                Non
              </button>
```

(The "OUI" button keeps `onClick={() => act("qualifie", "OUI ! → file de build")}` unchanged.)

- [ ] **Step 4: Update `app/page.tsx` to pass `queue` instead of `prospect`**

In `app/page.tsx:163-171`, change:

```tsx
        <CallMode
          prospect={prochain}
          restants={aAppeler.length}
          onStatus={setStatus}
          onClose={() => setCallMode(false)}
          onToast={showToast}
          onRemove={remove}
        />
```

to:

```tsx
        <CallMode
          queue={aAppeler}
          restants={aAppeler.length}
          onStatus={setStatus}
          onClose={() => setCallMode(false)}
          onToast={showToast}
          onRemove={remove}
        />
```

Leave `prochain` itself untouched — it's still used for `<ScriptPanel current={prochain} />` on `app/page.tsx:160`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/call-mode.test.tsx`

Expected: PASS — all 6 tests green.

- [ ] **Step 6: Run full test suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`

Expected: PASS, no type errors (confirms no other file still references the old `prospect` prop on `CallMode`).

- [ ] **Step 7: Commit**

```bash
git add components/call-mode.tsx components/call-mode.test.tsx app/page.tsx
git commit -m "feat: auto-advance Call Mode on Pas joint, hard-delete on Non"
```

---

## Self-Review Notes

- Spec coverage: "Pas joint" skip-to-back ✓ (Task 1, `passJoint`), session reset on reopen ✓ (unmount/remount is inherent to `{callMode && <CallMode/>}` in `page.tsx`, no code needed, covered by test relying on fresh `useState`), "Non" hard delete without confirm ✓ (`non` handler), "À rappeler"/"OUI" unchanged ✓ (left untouched), `restants` unaffected by skip ✓ (still `queue.length` passed from `page.tsx`), wrap-around ✓ (test 3 in Task 1).
- No placeholders — every step has full code.
- Single task was sufficient: the whole change is one component's internals plus a one-line prop change in its only caller; splitting further would just fragment one test cycle.
