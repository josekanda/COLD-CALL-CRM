# Aura · Cold-Call CRM

Ton CRM perso de prospection cold-call. Importe ta liste de prospects, appelle avec le script sous les yeux, suis tes OUI, génère les commandes de build, encaisse.

C'est le **cockpit** entre les deux skills du kit Aura : il avale le CSV du skill **prospect-finder** et te sort les commandes pour le skill **lead-to-site**.

## Déploie ton instance en 1 clic

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vadoke/aura-cold-call-crm)

**Démo live :** https://aura-cold-call-crm.vercel.app

1. Clique le bouton → connecte ton GitHub → Vercel fork le repo et déploie.
2. Ouvre ton URL `*.vercel.app`.
3. Glisse ton CSV `prospects_appels.csv` (export Apify / prospect-finder).

## Comment ça marche

- **Import** : glisse ton CSV dans la zone en haut. Un ré-import ne perd jamais tes statuts/notes/montants (fusion par entreprise + téléphone).
- **Appeler le prochain** : le gros bouton sort le meilleur lead non appelé, tél en grand, **script 6 temps + objections à l'écran** (variables remplies avec le prospect). Tu marques le statut en un clic.
- **OUI** : passe un prospect en « OUI · à construire » → la file de build te donne la **commande `lead-to-site`** à coller dans Claude Code.
- **Cash** : passe en « Site construit », saisis le montant encaissé → le KPI « CA encaissé » se met à jour.
- **Relances** : pose une date de rappel, filtre « 🔔 À rappeler aujourd'hui » chaque matin.

Tes données vivent dans **ton navigateur** (localStorage), sur ton instance. Rien n'est envoyé ailleurs, aucun compte à créer.

## Format CSV attendu

Colonnes (issues de prospect-finder) : `Entreprise, Ville, Activité, Téléphone, Note, NbAvis, LienFiche, Score, Pourquoi`. Le parser lit par nom de colonne, donc l'ordre et les colonnes manquantes ne cassent rien.

## Dev local

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests de la logique métier
npm run build    # build de production
```

Stack : Next 16 + shadcn/ui + Tailwind v4. 100 % client-side, zéro backend.
