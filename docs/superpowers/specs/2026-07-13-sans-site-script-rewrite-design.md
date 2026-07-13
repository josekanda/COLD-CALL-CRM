# Nouveau script "sans-site" + séquences distinctes par angle

## Contexte

Aujourd'hui, `CALL_STEPS` ([lib/call-script.ts](../../../lib/call-script.ts)) est une séquence unique de 5 étapes (hook / retournement / proposition zéro risque / verrouillage / sortie), partagée par les 3 angles d'appel (`site-mort`, `reseaux`, `sans-site`). Seuls le badge `ANGLE_PITCH` et le tip `SITE_MORT_TIP` varient selon l'angle ; le texte du script lui-même ne change jamais.

L'utilisateur veut un nouveau script pour le cas "sans site" (le cas par défaut, retourné par `angleAppel` quand la fiche ne mentionne ni lien cassé ni réseaux sociaux). Ce nouveau texte a un flow différent de l'ancien : il demande la permission avant de proposer un exemple, puis demande explicitement si l'envoi se fait par courriel ou par texto — l'ancien script imposait un envoi "ce soir" sans demander de canal. Les angles `site-mort` et `reseaux` gardent l'ancien flow tel quel.

Deux éléments dépendent du contenu du script et doivent donc aussi devenir spécifiques à l'angle "sans-site" :
- `BON_OUI` (actuellement un `string` global) exige "un créneau pour le rappel de demain" — le nouveau script sans-site ne demande jamais ce créneau, seulement un canal de contact valide.
- Une entrée d'`OBJECTIONS` ("Envoyez-moi un courriel.") répond en poussant vers un envoi le soir même sans courriel — ça contredit le nouveau script, qui offre justement le courriel comme option.

## Objectif

- `CALL_STEPS` devient `Record<Angle, ScriptStep[]>` : une séquence de 5 étapes par angle. `sans-site` reçoit le nouveau texte ; `site-mort` et `reseaux` gardent l'ancien texte, verbatim, à l'identique.
- `BON_OUI` devient `Record<Angle, string>` : `site-mort`/`reseaux` gardent l'exigence de créneau de rappel ; `sans-site` exige d'accepter l'exemple + un canal de contact valide (courriel ou confirmation du numéro pour texto), sans exigence de créneau.
- La réponse à l'objection "Envoyez-moi un courriel." est corrigée pour ne plus contredire le nouveau script.
- `components/call-mode.tsx` et `components/script-panel.tsx` sélectionnent la séquence et le texte `BON_OUI` selon l'angle calculé.
- `ANGLE_PITCH`, `SITE_MORT_TIP`, `ANGLE_LABELS`, le reste d'`OBJECTIONS`, et le label "Script 6 temps" dans `script-panel.tsx` ne changent pas (voir Hors périmètre).

## Changements

### `lib/call-script.ts`

Réordonner le fichier : déplacer la définition du type `Angle` (et `ANGLE_LABELS`/`ANGLE_PITCH`/`angleAppel`) **avant** `CALL_STEPS`, puisque `CALL_STEPS` a maintenant besoin du type `Angle`. Le contenu de ces déclarations ne change pas, seul leur ordre dans le fichier bouge.

Remplacer la déclaration actuelle de `CALL_STEPS` (`ScriptStep[]`) par :

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

(Les séquences `site-mort` et `reseaux` sont copiées verbatim depuis l'actuel `CALL_STEPS` — aucun changement de texte, seulement de structure.)

Remplacer la déclaration actuelle de `BON_OUI` (`string`) par :

```ts
export const BON_OUI: Record<Angle, string> = {
  "site-mort":
    "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».",
  reseaux:
    "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».",
  "sans-site":
    "Un bon OUI = il accepte de recevoir l'exemple ET il donne un courriel valide ou confirme que le texto sur ce numéro lui convient. Un « ouais, envoyez ça » vague sans courriel précis ni confirmation ne compte pas : pousse gentiment pour l'info exacte, sinon mets « À rappeler ».",
};
```

Dans le tableau `OBJECTIONS`, remplacer l'entrée `question: "Envoyez-moi un courriel."` :

```ts
{
  question: "Envoyez-moi un courriel.",
  reponse:
    "Parfait, c'est justement une des deux options qu'on offre. Quel est le meilleur courriel pour vous joindre ?",
},
```

(remplace uniquement `reponse` de cette entrée ; `question` et toutes les autres entrées d'`OBJECTIONS` restent identiques.)

### `components/call-mode.tsx`

`angle` est déjà calculé (`const angle = angleAppel(prospect.pourquoi);`). Remplacer :
- `CALL_STEPS.map((s) => (...))` par `CALL_STEPS[angle].map((s) => (...))`
- `{BON_OUI}` (dans le `<p>` sous les 4 boutons d'action) par `{BON_OUI[angle]}`

### `components/script-panel.tsx`

- Importer `angleAppel` depuis `@/lib/call-script`, aux côtés des imports existants (`CALL_STEPS`, `OBJECTIONS`, `fillScript`).
- Calculer `const angle = angleAppel(current?.pourquoi ?? "");` (sans prospect sélectionné, `angleAppel("")` retourne déjà `"sans-site"` — comportement par défaut existant, inchangé).
- Remplacer `CALL_STEPS.map((s) => (...))` par `CALL_STEPS[angle].map((s) => (...))`.

### `lib/call-script.test.ts`

Remplacer le bloc `describe("CALL_STEPS", ...)` par des assertions par angle :

```ts
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

(`import { fillScript, CALL_STEPS } from "./call-script";` en tête de fichier reste inchangé — `CALL_STEPS` est toujours le nom exporté, seul son type change.)

## Hors périmètre

- `ANGLE_PITCH`, `ANGLE_LABELS`, `SITE_MORT_TIP` : inchangés.
- Le label "Script 6 temps" dans `components/script-panel.tsx` : déjà incohérent avant ce changement (5 étapes réelles), non touché ici.
- Pas de nouveau champ `Prospect` pour le prénom du préposé : `(ton prénom)` reste un texte littéral que le préposé complète lui-même en parlant, comme le reste du script est un guide et non un remplissage automatique intégral.

## Tests

- `lib/call-script.test.ts` : voir bloc `describe("CALL_STEPS", ...)` ci-dessus (remplace l'existant).
- `components/call-mode.test.tsx` et `components/script-panel.tsx` n'ont pas de test dédié au rendu du script (aucun test existant à mettre à jour au-delà de `call-script.test.ts`).

## Addendum (2026-07-13, suite à la revue finale) : `OBJECTIONS` par angle

La revue de branche complète a signalé que la liste `OBJECTIONS` (partagée entre les 3 angles) contient plusieurs réponses qui supposent l'ancien flow (« ce soir », « le site », rappel demain, un seul canal) — au-delà de la seule entrée déjà corrigée. Comme `sans-site` est l'angle par défaut (le plus fréquent), ces réponses contredisent maintenant le script qu'utilise la majorité des appels. Décision : `OBJECTIONS` devient `Record<Angle, Objection[]>`, sur le même modèle que `CALL_STEPS`/`BON_OUI`.

- `site-mort` et `reseaux` partagent un même tableau interne (`socleObjections`), copié verbatim depuis l'actuel `OBJECTIONS` — y compris la réponse originale à « Envoyez-moi un courriel. » (« Je peux faire mieux. Ce soir vous recevez le site fini... »), qui redevient correcte pour ces deux angles à canal unique.
- `sans-site` reçoit son propre tableau. 6 entrées sur 13 restent identiques au socle (aucune promesse « ce soir »/« site fini »/rappel demain à corriger) : « C'est quoi l'arnaque, c'est gratuit ? », « Je marche au bouche à oreille... », « Je suis déjà sur Google. », « Combien ça coûte ? », « C'est vous l'IA, un robot ? », « Comment vous avez eu mon numéro ? ». 7 entrées sont reformulées pour coller au nouveau script (exemple envoyé par courriel/texto, pas de promesse de délai précis, pas de rappel demain garanti) :

```ts
const sansSiteObjections: Objection[] = [
  {
    question: "C'est quoi l'arnaque, c'est gratuit ?",
    reponse:
      "Il n'y en a pas. Vous regardez d'abord l'exemple, et si ça vous plaît, on parle du prix à ce moment-là. Si ça ne vous plaît pas, on en reste là. Je préfère montrer que promettre.",
  },
  {
    question: "Je marche au bouche à oreille, j'ai pas besoin.",
    reponse:
      "C'est exactement pour ça que je vous ai choisi, vos avis sont excellents. Et la moitié des gens à qui on vous recommande tapent votre nom sur Google avant d'appeler. Là, ils ne trouvent rien. Un site simple récupère ces gens-là.",
  },
  {
    question: "Je suis déjà sur Google.",
    reponse:
      "Votre fiche, oui, et elle est très bien. Mais quand on clique pour en savoir plus, il n'y a rien derrière. C'est la différence entre être trouvé et être choisi.",
  },
  {
    question: "Envoyez-moi un courriel.",
    reponse:
      "Parfait, c'est justement une des deux options qu'on offre. Quel est le meilleur courriel pour vous joindre ?",
  },
  {
    question: "J'ai pas le temps.",
    reponse:
      "Justement, ça ne prend aucun de votre temps. Je vous prépare un exemple, puis vous le regardez deux minutes quand ça adonne. C'est tout.",
  },
  {
    question: "Combien ça coûte ?",
    reponse:
      "On en parle quand vous l'aurez vu. Tant que ça ne vous plaît pas, ça ne coûte rien. Et c'est sans rapport avec les devis d'agence que vous avez peut-être déjà reçus.",
  },
  {
    question: "J'ai déjà un site.",
    reponse:
      "D'accord, je ne suis pas tombé dessus en cherchant votre entreprise. On peut quand même vous préparer un exemple pour comparer, ça n'engage à rien.",
  },
  {
    question: "C'est fait avec l'IA votre truc ?",
    reponse:
      "C'est fait par moi, avec les outils professionnels d'aujourd'hui. Ce qui compte, c'est le résultat, et vous jugerez quand vous aurez vu l'exemple.",
  },
  {
    question: "C'est vous l'IA, un robot ?",
    reponse:
      "Non non, je suis bien réel. Vous m'entendez hésiter, là ? (souris en le disant)",
  },
  {
    question: "Qui me rappelle, c'est vous ?",
    reponse:
      "On vous prépare l'exemple, puis on se reparle une fois que vous l'aurez vu.",
  },
  {
    question: "Je suis pas le patron.",
    reponse:
      "Vous faites bien de me le dire. On vous envoie l'exemple quand même, vous le montrez au patron, et on se reparle après.",
  },
  {
    question: "Rappelez-moi plus tard.",
    reponse:
      "Bien sûr, je vous prends pas plus de temps. On vous prépare l'exemple, puis on se reparle une fois que vous l'aurez vu.",
  },
  {
    question: "Comment vous avez eu mon numéro ?",
    reponse:
      "Sur votre fiche Google, là où vos clients vous trouvent. C'est justement de ça que je vous parle.",
  },
];

export const OBJECTIONS: Record<Angle, Objection[]> = {
  "site-mort": socleObjections,
  reseaux: socleObjections,
  "sans-site": sansSiteObjections,
};
```

`socleObjections` est déclaré comme `const socleObjections: Objection[] = [...]` (contenu = l'actuel `OBJECTIONS`, avec la réponse originale à « Envoyez-moi un courriel. » restaurée), non exporté — même schéma que `socleScript` pour `CALL_STEPS`. Ni `socleObjections` ni `sansSiteObjections` ne sont exportés individuellement ; seul `OBJECTIONS` l'est.

`components/script-panel.tsx` : remplacer `OBJECTIONS.map((o) => (...))` par `OBJECTIONS[angle].map((o) => (...))` (le composant calcule déjà `angle`, ajouté dans la tâche précédente).

Test : ajouter dans `lib/call-script.test.ts`, dans le `describe("CALL_STEPS", ...)` (ou un `describe("OBJECTIONS", ...)` séparé), une assertion que `OBJECTIONS["site-mort"]` et `OBJECTIONS["reseaux"]` pointent vers le même tableau (`toBe`, pas `toEqual`) et que `OBJECTIONS["sans-site"]` a bien 13 entrées.
