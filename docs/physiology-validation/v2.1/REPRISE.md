# Reproduction et reprise V2.1

Branche autorisée : `experiment/physiology-validation-v2`, PR #425. Ne pas écrire dans #420/#424. Baseline de revue : `bdb204f3fd25253268ffc3e64b13bc19b4db75d0`. Base PR : `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`.

## Commandes

Depuis la racine, avec les dépendances du dépôt :

```bash
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
./node_modules/.bin/vitest run physiologyValidationV2 physiologyReviewV21
bash scripts/physiology-validation/v2/run-existing-tests.sh
./node_modules/.bin/vitest run src/lib/plan/__tests__/lovableBuild.test.ts src/lib/plan/__tests__/lovableRelease.test.ts
./node_modules/.bin/vitest run --maxWorkers=4
npm run build
```

Ne pas augmenter un timeout historique pour masquer un échec. Le fichier FIT qui a dépassé son délai lors du run concurrent peut être isolé explicitement avec `vitest run src/lib/fitImport/__tests__/analyzer.test.ts --maxWorkers=1`, sans changer ses assertions.

Pour capturer le comparatif **dans le dossier V2.1 seulement** :

```bash
PHYSIOLOGY_V21_EVIDENCE=1 ./node_modules/.bin/vitest run physiologyReviewV21.qa
```

Ne pas définir `PHYSIOLOGY_V2_CAPTURE_BASELINE` ni `PHYSIOLOGY_V2_EVIDENCE` : les archives V2 sont figées. Les tests ne lancent pas la génération IA des plans QA.

Le build exige une déclaration source fraîche. Si une prochaine modification runtime la périme, utiliser `node scripts/preproduction/plan-release-source.mjs --write`, revoir le diff et relancer les protections ; jamais désactiver le garde ou déclarer un déploiement attesté.

Pour le navigateur système disponible dans cet environnement :

```bash
./node_modules/.bin/playwright test -c scripts/physiology-validation/v2.1/smoke.config.ts
```

Ce fichier de configuration ne change pas la CI : la spec est aussi découverte par le Playwright normal sous Chromium/WebKit. Le harnais intercepte une URL locale et bloque toute destination externe ; il n'ajoute aucune route produit, n'utilise aucun compte et ne prétend pas couvrir Supabase en réseau. Le transport du hook est vérifié séparément par les tests d'intégration.

ESLint se reproduit avec la procédure intacte de `.github/workflows/ci.yml` : lister les fichiers TS/TSX modifiés entre la base ci-dessus et la tête, hors `supabase/functions`, exécuter ESLint JSON sur la tête et sur les fichiers existant dans un worktree de base partageant les mêmes dépendances ; comparer les sommes `errorCount`. Les fichiers nouveaux ont une base de zéro. Les JSON archivés omettent seulement le texte source et les suggestions de correction pour limiter leur taille, pas les erreurs.

Pour les preuves rouges, créer un worktree détaché du SHA initial, y copier **seulement les versions du commit `fdc65c27abf84ba0aa1bf444f22ea3f9340aea65`** de `physiologyReviewV21.test.ts` et du test d'intégration V2 étendu ; exécuter ces deux fichiers. Les 17 échecs attendus et 5 passes sont archivés. La nouvelle assertion sur la confiance globale est reproduite séparément contre ce même commit (`global-confidence-before.txt`) ; elle ajoute un échec si l'on copie les tests de clôture au lieu des versions figées. Ne pas appliquer les corrections au worktree de référence.

## Budget unique — dix unités maximum

Début : 2026-10-29 15:28:59 UTC. Aucune prolongation automatique.

| Unité | Travail |
| --- | --- |
| 1 | Épingler dépôt, règles, branche, SHA et quatre checks initiaux. |
| 2 | Reproduire la régression ESLint et corriger les types. |
| 3 | Reproduire et corriger provenance, éditions successives et limite des notes. |
| 4 | Sécuriser discipline VLamax et qualification de l'origine effective. |
| 5 | Rejouer F4 et auditer les 25 effets MLSS / 37 profils. |
| 6 | Contrôler historiques, sérialisation, sauvegarde/réouverture simulées. |
| 7 | Rejouer suites, typage, build et protections release ; conserver les échecs. |
| 8 | Smoke Chromium synthétique et rapport ; limites documentées. |
| 9 | Rapport, correctifs sur la branche #425 et observation de sa CI. |
| 10 | Clôture, résultats réels, risques et décision DRAFT / NO-GO. |

Aucune équation remplacée, aucune donnée distante, migration, API payante, fusion ou déploiement. Un échec persistant doit être déclaré comme tel ; ne pas renouveler automatiquement le budget.
