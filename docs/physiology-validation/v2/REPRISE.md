# Reprise V2 — clôture bornée

Branche indépendante : **`experiment/physiology-validation-v2`**. Parent : `main` **`e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`**, dernier main confirmé au démarrage. #424 sert de preuve de départ, sans être fusionnée/modifiée. #420 lu jusqu'au SHA final V23 **`4ec5547875768f8430606401bb750445e381f71f`**, sans écriture.

PR indépendante publiée : [#425 — DRAFT / NO-GO](https://github.com/Vinch11/tfclab/pull/425). Commit de correction et preuves : `ddb47f08b8c4ccbee86a2425f97b371bcc239fa4`.

## Dix unités de travail

| Unité | Travail accompli |
| --- | --- |
| 1 | Environnement, AGENTS, dernier main, branche/worktree indépendants et SHA des PR |
| 2 | Reproductions F1–F4 de #424, validation de l'état initial |
| 3 | Séparation score/coût, raccordement des lecteurs MLSS et conservation des voies admissibles |
| 4 | Bornes, libellés, import selon discipline et tests LAB liés |
| 5 | Métadonnées connues/inconnues, notes, traces versionnées et dérives sans mélange d'unités |
| 6 | Intégration synthétique sauvegarde/réouverture/rapport, baseline 37 profils et différences attendues |
| 7 | Audit DET V22/V23, cas figés A/B/C et adaptations de contrat en lecture seule |
| 8 | Recherche bornée d'archives Git N=44/N=15/Modèle C et préparation de validation indépendante |
| 9 | Neuf livrables, preuves d'exécution, typecheck/build et déclaration de sources normale |
| 10 | Intégrité, empreintes, commit/push et nouvelle PR draft NO-GO, clôture |

Début : **29/10/2026 vers 14:39 UTC** ; limite absolue **15:39 UTC**. Heure de clôture, durée, versions et résultats dans [CLOSURE.json](evidence/CLOSURE.json). Dix unités au maximum, aucune prolongation ni relance automatique. Les nouveaux runs après modification ont été déclenchés explicitement pour vérifier cette modification ; aucun watcher ou ordonnanceur.

## Rejouer

Voir [les commandes et limites](INTEGRATION_VALIDATION.md). Les preuves avant QA proviennent d'un checkout immuable de main ; ne pas les remplacer par un calcul des sources V2. Les logs intermédiaires sont conservés ; les SHA de clôture couvrent tous les artefacts, hors fichier d'empreintes lui-même.

La déclaration `supabase/functions/_shared/planReleaseManifest.ts` a été régénérée par l'outil normal après changements frontend. C'est une déclaration de sources, **pas une attestation de déploiement** ; aucun catalogue, validateur ou contrat Edge modifié. Tout futur changement runtime impose le contrôle de fraîcheur habituel.

## Prochaines décisions nécessaires

- Revue ciblée F1–F4 et du format de provenance, en conservant le NO-GO tant que l'intégration n'est pas décidée.
- Revue des consommateurs legacy de coût/score et des libellés de cohortes dans les mini-rapports ; ne pas remplacer leurs méthodes sur la seule existence d'autres publications.
- Retrouver les archives originales ou qualifier ce qui existe déjà avant de financer ou refaire des essais.
- Adapter DET dans un chantier distinct : unknown n'est pas cohérent ; aucun remplacement favorable de la référence A et aucune condition de capacité levée automatiquement.
- Tester le navigateur/persistance réseau seulement dans un environnement autorisé et synthétique, puis décider de la validation indépendante utile.

Ne pas prolonger automatiquement cette mission. Aucune donnée athlète réelle, aucun coût, migration, fusion ou déploiement. Les travaux scientifiques existants et les 37 fixtures QA sont conservés.
