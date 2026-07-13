# Mode appel — avancer automatiquement à la prochaine entreprise

## Contexte

Dans Mode appel ([components/call-mode.tsx](../../../components/call-mode.tsx)), le prospect affiché vient de `prochain` = `aAppeler[0]` dans [app/page.tsx](../../../app/page.tsx) (`aAppeler` = prospects au statut `a_appeler`, triés par score). Quand un bouton change le statut du prospect courant vers autre chose que `a_appeler`, ce prospect sort de `aAppeler` et le suivant s'affiche automatiquement au prochain rendu — c'est déjà le cas pour "À rappeler" (`rdv`) et "OUI" (`qualifie`).

Deux problèmes restent :

1. **"Pas joint"** appelle `onStatus(id, "a_appeler")` — le statut ne change pas, donc le prospect reste en tête de `aAppeler` triée par score et se réaffiche immédiatement au lieu de passer au suivant.
2. **"Non"** doit désormais supprimer le prospect définitivement du CRM plutôt que le marquer `refus` (changement de comportement demandé, distinct du bug d'avancement).

## Objectif

- "Pas joint" passe à l'entreprise suivante de la file, en renvoyant le prospect courant en fin de file **pour la session d'appel en cours seulement** (statut toujours `a_appeler`). Si tout le monde a été "Pas joint" cette session, ça reboucle sur le premier skippé.
- Fermer puis rouvrir Mode appel réinitialise cet ordre de session : le tri par score reprend normalement.
- "Non" supprime le prospect définitivement (même effet que le lien "Supprimer ce prospect" existant), **sans** demande de confirmation — action rapide pendant un enchaînement d'appels.
- "À rappeler" et "OUI" : aucun changement, ils avancent déjà correctement.

## Changements

### `components/call-mode.tsx`

- `CallMode` reçoit une nouvelle prop `queue: Prospect[]` (liste complète des prospects `a_appeler`, triée par score — ce que `page.tsx` calcule déjà sous le nom `aAppeler`) à la place de la prop `prospect`. `restants` reste `queue.length`.
- Nouvel état local `const [skipped, setSkipped] = useState<string[]>([])`.
- Ordre affiché, calculé à chaque rendu :
  ```ts
  const skippedSet = new Set(skipped);
  const front = queue.filter((p) => !skippedSet.has(p.id));
  const back = skipped
    .map((id) => queue.find((p) => p.id === id))
    .filter((p): p is Prospect => !!p);
  const ordered = [...front, ...back];
  const prospect = ordered[0] ?? null;
  ```
  (`back` utilise `queue.find` : un id skippé qui n'est plus dans `queue`, par exemple parce que son statut a changé ailleurs entre-temps, disparaît naturellement de l'ordre affiché sans nettoyage explicite de `skipped`.)
- Comme `CallMode` n'est monté que pendant que Mode appel est ouvert (`{callMode && <CallMode ... />}` dans `page.tsx`), fermer puis rouvrir démonte/remonte le composant et réinitialise `skipped` automatiquement — pas de logique de reset à écrire.
- Bouton "Pas joint" :
  ```tsx
  onClick={() => {
    onStatus(prospect.id, "a_appeler");
    setSkipped((prev) => [...prev, prospect.id]);
    onToast("Pas joint — reste à appeler");
  }}
  ```
- Bouton "Non" :
  ```tsx
  onClick={() => {
    onRemove(prospect.id);
    onToast("Rayé");
  }}
  ```
  (retire l'appel à `onStatus(id, "refus")` — `onRemove` est déjà une prop existante de `CallMode`, utilisée par le lien "Supprimer ce prospect".)
- Boutons "À rappeler" et "OUI" : inchangés (`act("rdv", ...)`, `act("qualifie", ...)`).

### `app/page.tsx`

- Remplacer `prospect={prochain}` par `queue={aAppeler}` dans l'appel à `<CallMode>`.
- `prochain` reste utilisé tel quel pour `<ScriptPanel current={prochain} />` (hors périmètre de Mode appel, aucun changement).

## Hors périmètre

- Pas de confirmation avant suppression sur "Non" (différent du lien "Supprimer ce prospect", qui garde son `confirm()`).
- Pas de persistance de l'ordre de skip au-delà de la session Mode appel (pas de sauvegarde dans le store/localStorage).
- Pas de nettoyage explicite de `skipped` quand un id devient obsolète — le filtrage par `queue.find` au rendu suffit.

## Tests

`components/call-mode.test.tsx` :

- Adapter les tests existants ("Supprimer ce prospect") à la nouvelle prop `queue` (remplacer `prospect={p({...})}` par `queue={[p({...})]}`).
- Nouveau test : avec une `queue` de 3 prospects, cliquer "Pas joint" sur le premier affiche le deuxième.
- Nouveau test : skipper les 3 prospects un par un reboucle sur le premier skippé (vérifie le comportement de fin de file / wrap-around).
- Nouveau test : cliquer "Non" appelle `onRemove` avec l'id du prospect courant, n'appelle pas `window.confirm`, et n'appelle pas `onStatus` avec `"refus"`.
