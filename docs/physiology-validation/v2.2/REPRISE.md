# Reproduction, résultats et budget V2.2

Référence figée : `55fc9794f197876f2c5d35a0021dc0643b670561`. Branche #425 : `experiment/physiology-validation-v2`. Début : **2026-10-29 17:20:21 UTC**. Budget : **dix unités maximum**, sans renouvellement automatique.

| Unité | Travail réalisé |
| --- | --- |
| 1 | SHA, règles, état PR et environnement ; absence d'autorisation Supabase test. |
| 2 | Revue indépendante des unités, sources et consommateurs ; nouveaux oracles. |
| 3 | Accusés de sauvegarde, erreurs et récupérations ; protocole réel NON VALIDÉ. |
| 4 | Revue scientifique, archives existantes et qualification des écrans. |
| 5 | Contrat V25 épinglé, hashes réels et sonde en lecture seule. |
| 6 | 25 changements MLSS, 37 QA et historiques. |
| 7 | Correctifs minimaux des défauts reproduits ; réserve C8 conservée. |
| 8 | Suites, typage, build, release, lint et smoke synthétique. |
| 9 | Rapport et publication sur la seule branche #425. |
| 10 | Observation des checks finaux, décisions séparées et clôture. |

## Exécution reproductible

Depuis la racine avec les dépendances du dépôt :

```bash
./node_modules/.bin/vitest run physiologyValidationV2 physiologyReviewV21 physiologyReviewV22 useCloudData.persistence
PHYSIOLOGY_V22_EVIDENCE=1 ./node_modules/.bin/vitest run physiologyReviewV22
./node_modules/.bin/vitest run --maxWorkers=2
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
npm run build
./node_modules/.bin/playwright test -c scripts/physiology-validation/v2.1/smoke.config.ts
```

Ne pas définir les variables de capture V2/V2.1 : leurs preuves sont figées. Aucun plan IA n'est généré. La sonde DET utilise exclusivement le texte V25 épinglé en preuve, le prédicteur existant et le digest V25 ; son loader refuse les autres imports. Vérifier le blob Git du texte avant toute interprétation.

Le build utilise le garde normal. Après une modification runtime ultérieure seulement : `node scripts/preproduction/plan-release-source.mjs --write`, revue du diff, puis protections release/build. La déclaration reste non attestée ; catalogue, contrats, locks et empreintes Edge inchangés.

ESLint suit la procédure intacte de `.github/workflows/ci.yml`, base `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. La liste inclut désormais PillarVisuals : **252 erreurs de base contre 249 en tête**, aucune augmentation par fichier. Ces totaux ne se comparent pas directement aux 246/245 de V2.1, dont le périmètre de fichiers était plus étroit. Aucun contournement de règle.

## Preuves et limites

- `contracts-before.txt` : **7 échecs métier** sur le SHA de référence ; `writes-before.txt` : **3 échecs / 7 passes** ; `insert-recovery-before.txt` : **1 échec / 11 passes**, après la première correction d'update mais avant correction d'insert.
- `first-correction.txt` conserve l'échec de l'ancien oracle V2.1 de provenance ; fixture positive ensuite corrigée pour sélectionner réellement un snapshot, assertions conservées.
- `contracts-corrected.txt` : **92 tests passent**, avant ajout de la sonde DET et de l'observation finale.
- `independent-contracts-final.txt` : **11 tests de revue passent**, avec les 4 enveloppes V25 et la réserve legacy enregistrée.
- `full-suite.txt` : **402 fichiers passent, 3 149 tests passent, 1 ancien skip et 6 TODO**. Les sources runtime sont figées ; l'observation legacy ajoutée ensuite est couverte par le run ciblé final et la CI publiée. Aucun skip/TODO nouveau ajouté.
- `types-closure.txt`, `build-final.txt`, `browser-synthetic.txt` et les vérifications CI documentent leurs portées propres. Les ensembles de tests se recouvrent.
- [Persistance réelle](PERSISTENCE_REAL.md) : **NON VALIDÉE** ; le navigateur synthétique et le transport mémoire ne la remplacent pas.

Les quatre checks GitHub du **dernier SHA publié** sont consignés à clôture dans le corps de [#425](https://github.com/Vinch11/tfclab/pull/425), avec SHA et liens immuables des jobs. Les checks du SHA de référence ne sont pas substitués à ceux des corrections V2.2.

[Revue et anomalies](REVIEW.md) · [Science](SCIENTIFIC_REVIEW.md) · [Contrat DET](DET_V25_CONTRACT.md) · [Décisions](DECISION.md).
