# Vocabulaire québécois dans le script d'appel

## Contexte

Le script d'appel ([lib/call-script.ts](../../../lib/call-script.ts)) contient deux termes typés France dans la section `OBJECTIONS` :
- `"Envoyez-moi un mail."` — au Québec, le terme standard est "courriel".
- `"ça vaut toutes les plaquettes du monde"` (réponse à cette objection) — "plaquette" (brochure commerciale) est un terme plus France ; "dépliants" est plus courant au Québec.

Après relecture complète du fichier (CALL_STEPS, SITE_MORT_TIP, BON_OUI, ANGLE_LABELS/ANGLE_PITCH, les 13 OBJECTIONS), aucun autre terme n'est spécifique à la France — pas de "portable", pas de symbole €, pas de référence culturelle France. Le hook ("1 · Le hook") reste inchangé (options de reformulation proposées puis écartées par l'utilisateur — l'original convient).

## Objectif

Remplacer ces deux termes par leurs équivalents québécois, sans autre changement de contenu, de structure ou de ton.

## Changements

### `lib/call-script.ts`

Dans le tableau `OBJECTIONS`, l'entrée `question: "Envoyez-moi un mail."` :
```ts
{
  question: "Envoyez-moi un courriel.",
  reponse:
    "Je peux faire mieux. Ce soir vous recevez le site fini, directement sur ce numéro. Vous jugez sur pièce, ça vaut tous les dépliants du monde.",
},
```
(remplace la question et la réponse existantes à l'identique, sauf les deux mots ciblés).

## Hors périmètre

- Aucun autre terme du fichier n'est modifié.
- Le hook (`CALL_STEPS[0]`) reste inchangé.
- Aucun changement de test : `lib/call-script.test.ts` ne couvre pas le contenu d'`OBJECTIONS`, donc rien à mettre à jour.
