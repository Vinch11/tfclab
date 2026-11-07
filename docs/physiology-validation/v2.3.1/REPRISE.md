# Reproduction V2.3.1

Référence : `9f67b70240d21f4d07ef29828a64d01b2060fadf`. Branche expérimentale `experiment/physiology-validation-v2`, PR #425. Aucun changement de base, fusion de #420/#424, connexion Supabase ou donnée réelle. Début des rouges : 29 octobre 2026, 20:52 UTC.

## Contrôles de la branche corrigée

```bash
./node_modules/.bin/vitest run c8StabilizationV231
./node_modules/.bin/vitest run physiologyValidationV2 physiologyReviewV21 physiologyReviewV22 physiologyQualificationV23 src/lib/plan/__tests__/lovableBuild.test.ts src/lib/plan/__tests__/lovableRelease.test.ts
./node_modules/.bin/vitest run planValidator workoutCatalogBuilder.safetyPrerequisiteGuard
./node_modules/.bin/vitest run --maxWorkers=2
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
node scripts/physiology-validation/v2.3.1/verify-preservation.mjs
npm run build
./node_modules/.bin/playwright test -c scripts/physiology-validation/v2.1/smoke.config.ts
```

Les nouveaux tests ont un nom distinct ; le deuxième filtre conserve exactement les **147 tests / 17 fichiers** annoncés en V2.3. Le troisième conserve les **412 tests / 44 fichiers**. Les compteurs se recouvrent ; ne pas les additionner. Les nouvelles régressions C8 sont **45 tests** ; le run combiné ciblé est donc **192 tests / 18 fichiers**.

Le script de préservation compare les objets Git du SHA de référence. S'il faut autoriser son sous-processus Git dans le sandbox, employer le même script en lecture seule, sans supprimer ses assertions. Après une modification runtime uniquement, utiliser le rafraîchissement normal `node scripts/preproduction/plan-release-source.mjs --write`, revoir le diff puis rejouer les protections. Attestations de déploiement false ; aucun contournement.

Ne définir aucune variable de capture des références QA V2/V2.1/V2.2/V2.3. Les 37 profils et les archives restent immuables.

## Rouges indépendants avant correction

Un worktree détaché de la référence exécute les assertions de la revue indépendante. L'original est archivé dans `reproductions/independent-contract-reference.test.tsx.txt`, le résultat dans `evidence/independent-reference-red.txt` : **8 échecs d'assertion / 2 succès**, couvrant les cinq anomalies, plus les deux voies héritées R1/R2. I1 et I10 reproduisent le même défaut à deux frontières. Ce ne sont pas huit causes distinctes.

Les probes observatoires originaux comportaient aussi des assertions décrivant le comportement erroné (par exemple attendre 0,70). Ils ne doivent pas être transformés en oracles de conformité après correction. Les tests C8 de la branche utilisent les mêmes scénarios mais attendent explicitement l'absence de priorité textuelle, les identités externes et la conservation des origines. L'API héritée R1 reste répertoriée comme risque, pas déclarée corrigée artificiellement.

## Capture avant/après indépendante du modèle attendu

Le probe `reproductions/chain-probe.test.ts.txt` appelle les mêmes fonctions réelles dans deux worktrees : référence détachée et branche corrigée. Copier le fichier dans un répertoire temporaire, avec configuration Vitest happy-dom et alias `@` vers le `src` du worktree courant. Définir uniquement `C8_COMPARE_OUTPUT` vers le JSON de sortie voulu. Les captures `chain-before.json` / `chain-after.json` montrent résolveur, cycle, diagnostic, limiteurs, préparation et transfert de planification. Aucun appel réseau n'est autorisé dans le probe.

Le contrôle QA indépendant de la revue parcourt aussi les anciennes feuilles des 37 diagnostics : **5 133 nombres et 539 booléens identiques**, aucun champ historique absent. Son journal `independent-qa.txt` sélectionne seulement I9 ; les neuf skips affichés dans ce journal sont les autres probes non sélectionnés par `-t`, pas des tests du dépôt désactivés.

## Résultats intermédiaires conservés

Le premier run global avait commencé avant la finalisation : deux gardes de déclaration source étaient en échec avant rafraîchissement et deux assertions anciennes exigeaient encore une priorité textuelle laboratoire. Les entrées ont été conservées, les assertions de conformité incorrectes corrigées et justifiées dans `CAUSES_AND_FIXES.md`.

Un deuxième run global a été interrompu après ajout d'un contrôle d'unité/identité de cache pendant son exécution : il mélangeait des modules chargés avant la correction avec ce nouveau test. Il n'est pas revendiqué comme preuve finale. Le run final stable et la CI du SHA publié sont les références de clôture. Les échecs restent archivés. Le premier lancement Chromium dans le sandbox n'a pas pu démarrer le serveur ; le lancement local autorisé, destinations externes bloquées, a réussi sans changer les tests ni les validations.

ESLint est comparé fichier par fichier au même main `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`, mêmes dépendances, hors Edge comme le workflow inchangé. Les nouveaux fichiers doivent rester à zéro erreur ; aucune hausse par fichier n'est acceptée. Aucun ajout de suppression de règle.

## Publication

Les quatre checks du **SHA final exact**, leurs liens GitHub et les verdicts distincts sont consignés dans le corps de [#425](https://github.com/Vinch11/tfclab/pull/425). Aucun ancien succès n'est substitué à un check du dernier commit ; aucune relance automatique du workflow. DRAFT / NO-GO global maintenu.
