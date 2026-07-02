export interface ScriptVars {
  entreprise: string;
  ville: string;
  activite: string;
}

export function fillScript(tpl: string, v: ScriptVars): string {
  return tpl
    .replaceAll("[entreprise]", v.entreprise || "[entreprise]")
    .replaceAll("[ville]", v.ville || "[ville]")
    .replaceAll("[métier]", v.activite || "[métier]");
}

export interface ScriptStep {
  titre: string;
  texte: string;
}

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

// Variante à glisser quand la fiche a un lien site MORT (Pourquoi : lien casse / domaine en vente / gratuit amateur).
export const SITE_MORT_TIP =
  "Variante site mort — « Petite chose : en préparant mon appel, j'ai cliqué sur le lien site de votre fiche Google… et ça affiche une erreur. Pour un client, c'est pire que pas de site : on dirait que c'est fermé. » (La preuve est vérifiable par le patron en direct.)";

// Ce qui compte comme un bon OUI (tracker, feuille Script). À garder en tête au
// moment de cliquer OUI : sans créneau de rappel, ce n'est pas un vrai OUI.
export const BON_OUI =
  "Un bon OUI = il accepte de recevoir le site ET il te donne un créneau pour le rappel de demain. Un « ouais, envoyez un mail » pour se débarrasser ne compte pas : pousse gentiment pour le créneau, sinon mets « À rappeler ».";

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

export interface Objection {
  question: string;
  reponse: string;
}

export const OBJECTIONS: Objection[] = [
  {
    question: "C'est quoi l'arnaque, c'est gratuit ?",
    reponse:
      "Il n'y en a pas. Vous regardez d'abord, et si le site vous plaît, on parle du prix à ce moment-là. S'il ne vous plaît pas, je le supprime et on en reste là. Je préfère montrer que promettre.",
  },
  {
    question: "Je marche au bouche à oreille, j'ai pas besoin.",
    reponse:
      "C'est exactement pour ça que je vous ai choisi, vos avis sont excellents. Et la moitié des gens à qui on vous recommande tapent votre nom sur Google avant d'appeler. Là, ils ne trouvent rien. Le site récupère ces gens-là.",
  },
  {
    question: "Je suis déjà sur Google.",
    reponse:
      "Votre fiche, oui, et elle est très bien. Mais quand on clique pour en savoir plus, il n'y a rien derrière. C'est la différence entre être trouvé et être choisi.",
  },
  {
    question: "Envoyez-moi un mail.",
    reponse:
      "Je peux faire mieux. Ce soir vous recevez le site fini, directement sur ce numéro. Vous jugez sur pièce, ça vaut toutes les plaquettes du monde.",
  },
  {
    question: "J'ai pas le temps.",
    reponse:
      "Justement, ça ne prend aucun de votre temps. Moi je travaille cet après-midi. Vous, vous regardez deux minutes ce soir. C'est tout.",
  },
  {
    question: "Combien ça coûte ?",
    reponse:
      "On en parle quand vous l'aurez vu. Tant que ça ne vous plaît pas, ça ne coûte rien. Et c'est sans rapport avec les devis d'agence que vous avez peut-être déjà reçus.",
  },
  {
    question: "J'ai déjà un site.",
    reponse:
      "Au temps pour moi, je regarde… il date un peu, non ? Alors je vous propose la même chose. Je vous prépare une version moderne, vous comparez les deux ce soir, ça n'engage à rien.",
  },
  {
    question: "C'est fait avec l'IA votre truc ?",
    reponse:
      "C'est fait par moi, avec les outils professionnels d'aujourd'hui. Ce qui compte, c'est le résultat, et vous le jugez ce soir.",
  },
  {
    question: "C'est vous l'IA, un robot ?",
    reponse:
      "Non non, je suis bien réel. Vous m'entendez hésiter, là ? (souris en le disant)",
  },
  {
    question: "Qui me rappelle, c'est vous ?",
    reponse:
      "On vous prépare le site et un de l'équipe vous rappelle demain pour vous le présenter. Vous êtes joignable plutôt le matin ou l'après-midi ?",
  },
  {
    question: "Je suis pas le patron.",
    reponse:
      "Vous faites bien de me le dire. On vous envoie le site quand même, vous le montrez au patron, et on rappelle demain. Il est joignable plutôt le matin ou l'après-midi ?",
  },
  {
    question: "Rappelez-moi plus tard.",
    reponse:
      "Bien sûr, je vous prends pas plus. On vous prépare le site, vous le recevez en fin de journée, et on vous rappelle demain à tête reposée.",
  },
  {
    question: "Comment vous avez eu mon numéro ?",
    reponse:
      "Sur votre fiche Google, là où vos clients vous trouvent. C'est justement de ça que je vous parle.",
  },
];
