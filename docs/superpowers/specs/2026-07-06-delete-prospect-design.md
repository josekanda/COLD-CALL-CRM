# Suppression d'un prospect

## Contexte

Le CRM ne permet actuellement de retirer des prospects que tous en même temps, via le bouton "Réinitialiser" ([app/page.tsx](../../../app/page.tsx)) qui vide toute la liste (`resetProspects` dans [lib/crm-store.ts](../../../lib/crm-store.ts)). Il n'existe aucun moyen de supprimer un seul prospect (doublon, fiche erronée, mauvaise entrée CSV, etc.).

L'utilisateur veut un bouton "Supprimer" pour retirer un prospect individuel, à la fois depuis le tableau principal ([components/prospect-table.tsx](../../../components/prospect-table.tsx)) et depuis le Mode appel ([components/call-mode.tsx](../../../components/call-mode.tsx)).

## Objectif

Ajouter la suppression d'un prospect individuel, avec confirmation avant suppression (pas de corbeille — stockage local uniquement, l'action est irréversible), accessible depuis les deux écrans où un prospect est géré.

## Changements

### `lib/crm-store.ts`

Ajouter :
```ts
export function removeProspect(id: string) {
  const cur = getSnapshot();
  commit({ ...cur, prospects: cur.prospects.filter((p) => p.id !== id) });
}
```
(même forme que `updateProspect`/`resetProspects` déjà présents dans ce fichier — pas de test dédié requis pour ce fichier, cohérent avec le reste : aucune des fonctions existantes de `crm-store.ts` n'a de test unitaire, la logique testable vit dans `lib/store.ts`).

### `hooks/use-crm.ts`

Exposer `removeProspect` sous le nom `remove` dans l'objet retourné par `useCrm()`, aux côtés de `update`, `setStatus`, etc.

### `app/page.tsx`

Passer `onRemove={remove}` aux deux composants `<ProspectTable>` et `<CallMode>`.

### `components/prospect-table.tsx`

- `ProspectTable` accepte une nouvelle prop `onRemove: (id: string) => void`.
- Dans la cellule Actions (sticky, dernière colonne), ajouter un bouton après "A dit OUI" :
```tsx
<button
  onClick={() => {
    if (!confirm(`Supprimer définitivement "${p.entreprise}" ?`)) return;
    onRemove(p.id);
    onToast("Prospect supprimé");
  }}
  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-2 py-1 text-xs font-semibold"
>
  <Trash2 className="size-3" aria-hidden />
  Supprimer
</button>
```
(`Trash2` importé depuis `lucide-react`, ajouté à la liste d'imports existante).

### `components/call-mode.tsx`

- `CallMode` accepte une nouvelle prop `onRemove: (id: string) => void`.
- Sous la grille 2×2 des actions d'appel (Pas joint / À rappeler / Non / OUI) et le paragraphe `BON_OUI`, ajouter un lien texte discret (pas un bouton de même poids visuel que les actions d'appel, pour éviter tout clic accidentel pendant le flux d'appel) :
```tsx
<button
  onClick={() => {
    if (!confirm(`Supprimer définitivement "${prospect.entreprise}" ?`)) return;
    onRemove(prospect.id);
    onToast("Prospect supprimé");
  }}
  className="mt-3 flex items-center justify-center gap-1 mx-auto text-xs text-destructive underline-offset-2 hover:underline"
>
  <Trash2 className="size-3" aria-hidden />
  Supprimer ce prospect
</button>
```
(`Trash2` ajouté aux imports `lucide-react` existants).
- Aucun changement au calcul de `prochain`/`aAppeler` dans `app/page.tsx` : la suppression retire le prospect de `state.prospects`, donc le prospect affiché en Mode appel est recalculé automatiquement au prochain rendu (identique au comportement déjà en place quand `onStatus` change le statut du prospect courant). Si plus aucun prospect n'a le statut `a_appeler`, l'écran "Plus personne à appeler" s'affiche déjà (`components/call-mode.tsx`, cas `!prospect`).

## Hors périmètre

- Pas de corbeille / annulation — l'action est immédiate et définitive après confirmation.
- Pas de suppression multiple (sélection de plusieurs prospects à la fois).
- Pas de nouvel état global : `onRemove` est une prop passée depuis l'état déjà géré par `useCrm()`.

## Tests

- `components/prospect-table.test.tsx` : ajouter des tests qui mockent `window.confirm` (`vi.spyOn(window, "confirm")`) et vérifient que `onRemove` est appelé avec le bon id quand `confirm` renvoie `true`, et n'est pas appelé quand `confirm` renvoie `false`.
- `components/call-mode.test.tsx` (nouveau fichier) : mêmes deux cas (confirmé / annulé) sur le lien "Supprimer ce prospect", en rendant `CallMode` avec un prospect factice.
- Pas de test pour `removeProspect` dans `lib/crm-store.ts` (cohérent avec l'absence de tests sur les fonctions voisines de ce fichier).
