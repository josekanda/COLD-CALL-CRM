# Filtre par statut sur la colonne "Statut"

## Contexte

Le tableau des prospects ([components/prospect-table.tsx](../../../components/prospect-table.tsx)) affiche une colonne "Statut" par prospect. Une barre de filtres ([components/toolbar.tsx](../../../components/toolbar.tsx)) existe déjà au-dessus du tableau avec des chips ("Tous", "À appeler", "À rappeler aujourd'hui", "RDV", "OUI · à construire", "Construits", "Upsell en cours"), pilotant un état `filter: Filter` géré dans [app/page.tsx](../../../app/page.tsx). La logique de filtrage par statut existe déjà (`filter !== "all"` → `p.status === filter`).

Gap identifié : le statut `"refus"` ("Pas intéressé") n'a pas de chip dans la Toolbar, et il n'y a aucun moyen de filtrer directement depuis l'en-tête de la colonne Statut du tableau.

## Objectif

1. Ajouter un chip "Pas intéressé" à la Toolbar pour couvrir les 5 statuts existants.
2. Ajouter un `<select>` de filtre dans l'en-tête de la colonne "Statut" du tableau, piloté par le même état `filter` que la Toolbar (synchronisation bidirectionnelle — les deux contrôles reflètent et modifient le même state).

## Changements

### `components/toolbar.tsx`

Ajouter une entrée dans `CHIPS` :
```ts
{ f: "refus", label: "Pas intéressé" },
```
(placé après "Construits", avant "Upsell en cours", pour suivre l'ordre du pipeline).

### `components/prospect-table.tsx`

- `ProspectTable` accepte deux nouvelles props : `filter: Filter` et `onFilter: (f: Filter) => void` (type `Filter` importé depuis `@/components/toolbar`).
- Le `<th>` "Statut" contient un `<select>` avec :
  - une option `"all"` → "Tous les statuts"
  - une option par entrée de `STATUSES` (les 5 statuts réels)
  - `value` : si `filter` est `"all"` ou un `Status` valide, l'afficher tel quel ; si `filter` vaut `"rappel"` ou `"upsell"` (valeurs de chips qui ne correspondent à aucun `Status`), afficher `"all"` par défaut (le select ne peut pas représenter ces filtres spéciaux, mais le filtre réel reste actif tant que l'utilisateur ne touche pas ce select).
  - `onChange` appelle `onFilter(e.target.value as Filter)`.

### `app/page.tsx`

Passer les props `filter={filter}` et `onFilter={setFilter}` (state déjà existant) à `<ProspectTable>`.

## Hors périmètre

- Pas de nouveau type ni de nouvel état global : réutilisation intégrale de `Filter` et du state `filter`/`setFilter` déjà en place.
- Pas de filtrage multi-statuts (sélection unique, comme les chips actuels).
- Pas de changement à la logique de tri ou de recherche existante.

## Tests

Pas de test automatisé dédié prévu (le composant `ProspectTable` n'a pas de suite de tests existante) ; vérification manuelle dans le navigateur après implémentation : sélectionner un statut dans le select de la colonne, vérifier que le tableau se filtre et que le chip correspondant dans la Toolbar s'active en retour, et vice-versa.
