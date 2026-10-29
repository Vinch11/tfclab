# Reprise — Physiological Validation V1

**DRAFT — NO-GO.** Branche `experiment/physiology-validation`, parent `main` `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. #420 non intégrée et non modifiée. Ne pas poursuivre automatiquement après clôture de cette mission.

PR draft créée : [#424](https://github.com/Vinch11/tfclab/pull/424). Commit initial de preuves : `38109dfc8617827a018129d10620733bd9e493c6`.

## Dix unités de travail

| Unité | Périmètre exécuté |
| --- | --- |
| 1 | Consignes AGENTS, environnement, baseline main et branche indépendante |
| 2 | Inventaire méthodes, tests, bibliographie, calibrations et limites de preuve |
| 3 | Lecture des calculateurs prioritaires et distinction données/références/modèles |
| 4 | Exécution des 35 fichiers de tests existants, 332 PASS |
| 5 | Chaîne brute→snapshot→effectifs→diagnostic→plan ; artefacts synthétiques |
| 6 | Profils, limiteurs, graphiques/rapports, provenance et incertitude |
| 7 | Lecture seule DET au SHA fixe, comparaison des versions et contrat nécessaire |
| 8 | Reproduction F1–F4, adaptateurs/patch isolés, non-régressions 37 profils QA |
| 9 | Neuf livrables, recalcul ciblé RMSE, preuves et limites explicitement attribuées |
| 10 | Contrôles d'intégrité, commit/push de la branche et PR draft NO-GO, clôture |

Début des contrôles : 2026-10-29 vers 13:52 UTC. Fin et durée mesurées dans `evidence/integrity.json` ; limite absolue 14:52 UTC. Aucune relance automatique, API payante, délégation, revue humaine ou campagne physiologique réelle.

## Reproduire sans service externe

Après installation des dépendances compatibles :

```sh
bash experimental/physiology-validation/v1/run-existing-tests.sh
./node_modules/.bin/vitest run --config experimental/physiology-validation/v1/vitest.config.ts
git apply --check experimental/physiology-validation/v1/economy-contract.patch
node experimental/physiology-validation/v1/recalculate-run-mlss-reference.mjs
```

Pour retrouver volontairement les défauts de production, les commandes suivantes doivent échouer :

```sh
PHYSIOLOGY_BASELINE=1 ./node_modules/.bin/vitest run --config experimental/physiology-validation/v1/vitest.config.ts experimental/physiology-validation/v1/confirmed-defects.test.ts
PHYSIOLOGY_BASELINE=1 ./node_modules/.bin/vitest run --config experimental/physiology-validation/v1/vitest.config.ts experimental/physiology-validation/v1/economy-contract.test.ts
```

Pour écrire de nouvelles preuves de chaîne, `PHYSIOLOGY_WRITE_EVIDENCE=1` est nécessaire ; cela écrase les JSON du harnais dans ce dossier, donc conserver les artefacts actuels avant un nouveau run. Les logs historiques V1 ne sont pas réécrits par les commandes ci-dessus sans redirection explicite.

Le harnais F4 crée un module virtuel à partir du diagnostic original et remplace **uniquement les deux arguments CE du helper MLSS**. Il ne modifie pas le module utilisé par l'application ou par les 332 tests de production. Le patch texte comprend aussi la déclaration de type du nouveau champ optionnel. Tous les autres candidats délèguent aux fonctions originales ; aucun import depuis `src/` vers `experimental/`.

## Prochaines décisions, hors budget V1

1. Relire les quatre candidats et définir leur intégration éventuelle dans un chantier autorisé distinct. F4 prioritaire : distinguer coût O₂ et score ; choisir une source réelle et unitaire pour le coût, ou accepter son absence. Ne pas fabriquer de conversion score→CE.
2. Consolider les archives déjà existantes des calibrations N=44, N=15 et Modèle C : observations anonymisées autorisées, protocole, date réelle, version, séparation ajustement/validation, unités et calcul d'erreur. Les liens `mem://` ne sont pas consultables dans Git ; ne pas conclure que le travail scientifique n'existe pas ailleurs.
3. Examiner les lecteurs parallèles/traces qui nomment `runningEconomy` à partir d'un score, et les imports labo historiques, sans correction ou migration automatique.
4. Contrat minimal DET : nature scientifique + stockage séparés, unités/discipline/date par champ et incertitudes connues. Appliquer toute correction dans une nouvelle étape dédiée, **jamais modifier #420 dans V1**.
5. Tester ensuite les sauvegardes React/DB et les rendus concernés avec fixtures synthétiques, puis seulement une validation indépendante hors échantillon si elle est nécessaire et autorisée. Ne pas refaire une validation déjà retrouvée et correctement démontrée.

Aucun GO sportif, médical, scientifique individuel ou de déploiement n'est accordé par ce dossier. Les équations et travaux scientifiques existants sont conservés.
