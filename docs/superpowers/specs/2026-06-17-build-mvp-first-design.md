# Build « MVP-first » — refonte de la stratégie du bouton build

**Date :** 2026-06-17
**Projet :** aura-cold-call-crm (bouton build) + skill `lead-to-site`
**Statut :** design approuvé, prêt pour implémentation

## Problème

Le bouton build lance `claude -p` sur un `/goal` qui demande à la skill `lead-to-site`
un site premium complet avec une **condition de fin trop dure** (design ≥ 85/100 ET
`qa_check.py` ET `npm build`) et une **boucle visuelle lourde** (screenshots → agent
critique → fixer, en boucle jusqu'à 85). Diagnostic d'un run réel : l'agent
progressait linéairement mais **trop lentement** pour le périmètre (10 sections + ROI
+ SEO + boucle visuelle + qa + deploy, écrits fichier par fichier). Tué en cours, il
n'avait **rien d'assemblé** (`page.tsx` = template par défaut). Conclusion : il faut
viser un **livrable garanti** plutôt qu'un site parfait autonome.

## Objectif

Le build doit livrer **~80 % à tous les coups** : un site **en ligne qui capte des
leads**, plus une liste claire des **20 % restants** à peaufiner par l'humain.

## Décisions (validées)

1. **Stratégie : minimal viable d'abord + déployé, puis enrichir.** Le succès = le
   checkpoint déployé atteint, pas un site parfait.
2. **Boucle visuelle : 1 seule passe de contrôle à la fin** (1 screenshot mobile + 1
   desktop → corriger les défauts criants une fois → stop). Pas de note à atteindre,
   pas de N tours.
3. **Module ROI : conversion de base dès le minimal viable** (formulaire de devis
   fonctionnel + bouton d'appel). Le tracking fin (analytics, événements, notif lead
   < 30 s) part en enrichissement.

## Le build en 5 phases

| Phase | Action | Garantie |
|-------|--------|----------|
| 0 · Recherche express | infos commerce + `BRIEF.md` (borné) | — |
| 1 · Minimal viable | scaffold + header + hero + services + **formulaire devis + bouton appel** + footer, **assemblés dans `page.tsx`** | — |
| 2 · Déploiement checkpoint 🎯 | `npm build` OK → deploy Vercel → URL live | **Site en ligne qui convertit. Livrable même si on coupe ensuite.** |
| 3 · Enrichissement (si budget) | sections bonus (avis, à-propos, galerie), SEO géoloc, tracking fin → re-deploy | best-effort |
| 4 · 1 passe visuelle | 1 screenshot mobile + 1 desktop → fix des défauts criants une fois → re-deploy si besoin | filet visuel |
| 5 · Handoff | `HANDOFF.md` = les 20 % restants + l'URL live, puis stop | l'humain sait quoi finir |

## Condition d'arrêt

- **Succès minimal = phase 2 atteinte** (site live + déployé). Le reste est
  best-effort dans un budget de tours **borné** (généreux mais fini).
- On **supprime** la porte bloquante « design ≥ 85 ET qa_check ET npm build ».
  `npm build` doit passer (sinon pas de déploiement) ; `qa_check.py` reste un
  contrôle informatif, pas une condition d'arrêt.
- Règle absolue conservée : **zéro mention d'outil/IA** dans le livrable.

## Où vit la logique (hybride)

- **Skill `lead-to-site`** (hors repo, `~/.claude/skills/lead-to-site/`) : porte le
  nouveau **mode « MVP-first »** (réutilisable hors CRM). Concrètement : une référence
  décrivant les 5 phases + la boucle visuelle courte + le handoff, et `boucle-visuelle.md`
  allégée (1 passe, non bloquante).
- **CRM `scripts/build-lead.mjs` → `buildGoal()`** : le `/goal` devient **court** et
  pointe sur le mode MVP-first + encode la condition d'arrêt réaliste (checkpoint =
  succès, reste best-effort, borne de tours).
- **Timeline CRM** (`lib/build-timeline.ts` + `components/build-queue.tsx`) :
  optionnel — étendre/renommer les phases pour refléter MVP → checkpoint →
  enrichissement → contrôle visuel → live+handoff (les helpers sont déjà monotones).

## Validation

- **Prompt engineering** : pas de test d'exécution réelle sans quota. On vérifie :
  - test unitaire sur `buildGoal()` : le `/goal` généré mentionne bien les phases,
    le checkpoint déploiement, la boucle visuelle 1 passe, le handoff, et **ne
    contient plus** la porte bloquante design ≥ 85 ;
  - `--dry-run` du lanceur propre (affiche le nouveau `/goal`, prérequis verts) ;
  - 41+ tests existants + lint + `next build` restent verts.
- **Preuve réelle** (hors apex, par l'humain, consomme du quota) : un vrai build qui
  atteint le checkpoint déployé et produit un `HANDOFF.md`.

## Hors scope

- Re-tester un vrai build dans apex (quota).
- Refonte du module ROI lui-même (on réordonne juste quand il est posé).
- Support Windows du build (local macOS).
