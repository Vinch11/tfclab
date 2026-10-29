# Reproduction et clôture V2.3

Branche : `experiment/physiology-validation-v2`, PR #425. Référence : `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`. Début : **2026-10-29 19:10:50 UTC**. Travail borné à dix unités, sans prolongation automatique.

1. Épingler référence, règles et environnement ; aucune connexion Supabase.
2. Capturer les 37 diagnostics et reproduire C8 sur la référence.
3. Introduire la qualification séparée et son contrat de provenance.
4. Propager provenance, sérialisation et handoff sans changer les nombres.
5. Corriger les consommateurs et les caches historiques.
6. Tester les catégories, incompatibilités et incertitudes séparées.
7. Comparer les 37 profils et les fonctions mathématiques protégées.
8. Exécuter régressions, build, typage, navigateur et contrôles de release/lint.
9. Publier rapport et preuves sur #425 uniquement.
10. Observer les quatre checks du SHA final et clore avec les verdicts séparés.

## Commandes

Depuis la racine, avec les dépendances du dépôt :

```bash
PHYSIOLOGY_V23_EVIDENCE=1 ./node_modules/.bin/vitest run physiologyQualificationV23
./node_modules/.bin/vitest run physiologyValidationV2 physiologyReviewV21 physiologyReviewV22 physiologyQualificationV23 src/lib/plan/__tests__/lovableBuild.test.ts src/lib/plan/__tests__/lovableRelease.test.ts
./node_modules/.bin/vitest run --maxWorkers=2
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
node scripts/physiology-validation/v2.3/verify-preservation.mjs
npm run build
./node_modules/.bin/playwright test -c scripts/physiology-validation/v2.1/smoke.config.ts
```

Ne pas définir les variables de capture V2, V2.1 ou `PHYSIOLOGY_V23_CAPTURE` lors du rejeu : les références ne doivent pas être réécrites. Le fichier gzip de référence est épinglé dans les preuves. Les tests QA n'appellent pas une génération IA.

Le vérificateur de préservation lit les objets Git de référence ; si un sandbox interdit son sous-processus Git, exécuter le même contrôle en lecture seule dans un environnement autorisé, sans supprimer ses assertions. Il recalcule les six fonctions, treize initialisations et modifications documentaires autorisées.

Après une modification runtime ultérieure seulement, utiliser le rafraîchissement normal `node scripts/preproduction/plan-release-source.mjs --write`, puis revoir le diff et rejouer les protections. Aucun garde n'est contourné. Attestations de déploiement restent false.

Le navigateur utilise une page locale interceptée, des identités synthétiques, les fonctions réelles et localStorage ; les destinations externes sont bloquées. Il ne démontre ni Supabase, ni RLS, ni impression native réelle.

Pour reproduire les rouges C8 : worktree détaché du SHA de référence, mêmes dépendances, copier seulement les trois premiers tests du fichier `physiologyQualificationV23.test.tsx` (avant l'import du nouveau qualificateur), objectif `Ironman`. Trois échecs d'assertion attendus. Les sources du worktree de référence ne sont pas corrigées.

ESLint suit le workflow intact : fichiers TS/TSX modifiés contre `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`, hors Edge ; nouveaux fichiers à base zéro, anciens fichiers lintés sur un worktree de base avec mêmes dépendances. Les totaux dépendent du périmètre élargi ; lire `lint-head.json` et `lint-base.json`, pas les anciens totaux V2.2. Aucune règle supprimée.

Les résultats intermédiaires et leurs échecs restent archivés : alias d'objectif initial corrigé, hashes de labels volontairement différents, sérialisation de propriétés optionnelles rectifiée sans modifier les assertions, sélecteur de texte multiple corrigé. Les runs se recouvrent. Les quatre checks du **dernier SHA publié** et le reçu de clôture sont consignés dans le corps de [#425](https://github.com/Vinch11/tfclab/pull/425).

[Résultats/verdicts](V23_RESULTS.md) · [Contrat](SCIENTIFIC_REFERENCE_CONTRACT.md) · [Matrice](SOURCE_QUALIFICATION_MATRIX.md) · [Surfaces](SURFACE_CONSUMER_AUDIT.md) · [Non-régression](NUMERIC_NON_REGRESSION.md).
