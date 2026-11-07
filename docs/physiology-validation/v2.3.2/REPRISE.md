# Reproduction V2.3.2

Base : `429a84c1c35255843251a478ef3f48ab0dd907c6`, même branche expérimentale #425. Début du rouge : 29 octobre 2026, 21:32 UTC.

```bash
./node_modules/.bin/vitest run c8CohortV232
./node_modules/.bin/vitest run c8StabilizationV231
./node_modules/.bin/vitest run physiologyValidationV2 physiologyReviewV21 physiologyReviewV22 physiologyQualificationV23 src/lib/plan/__tests__/lovableBuild.test.ts src/lib/plan/__tests__/lovableRelease.test.ts
./node_modules/.bin/vitest run planValidator workoutCatalogBuilder.safetyPrerequisiteGuard
./node_modules/.bin/vitest run --maxWorkers=2
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
npm run build
```

Périmètres conservés : **45 tests V2.3.1**, **147 tests historiques / 17 fichiers**, **412 protections / 44 fichiers**. Nouvelles vérifications : **16 tests / 2 fichiers**. Les ensembles se recouvrent ; ne pas les additionner aux tests globaux.

`C8_V232_EVIDENCE=1` écrit uniquement les preuves de la nouvelle cohorte. Ne définir aucune variable de capture des anciens profils QA. Le fichier `cohort-before.json` vient du worktree immuable de référence et n'est jamais régénéré par ce rejeu.

Les scripts de capture et du rouge initial sont archivés sous `reproductions/`, sous forme texte. Dans l'environnement de la mission, le rouge exact était :

```bash
./node_modules/.bin/vitest run -c /tmp/c8-final-probes/vitest.config.mts closure-contract -t 'A5 NEW COUNTEREXAMPLE'
```

Un échec d'assertion attendu, dix autres sondes exclues par sélection ; aucun test du dépôt désactivé. La capture antérieure de la page et du CSV exécute `capture-reference.test.tsx.txt` depuis un worktree détaché du SHA de référence, avec un alias `@` vers son `src`. Les lectures Supabase sont remplacées par des lignes synthétiques locales ; aucun insert/delete n'est appelé.

Le contrôle indépendant des 37 profils est celui de la revue C8, rejoué sans modification : **5 133 feuilles numériques et 539 booléens identiques**, aucun champ historique absent. Ses neuf skips sont les sondes externes non sélectionnées par `-t`, pas de nouveaux skips du dépôt.

## Contrôle R1 minimal

`c8CohortV232.boundary.test.ts` suit les symboles runtime depuis les modules de diagnostic/planification et leurs dépendances transitives. Il résout imports directs, aliases/barrels, namespaces, réexports et imports dynamiques ; l'accès dynamique non résolvable ne prouve pas l'isolation. Les types explicitement marqués restent autorisés. Un contrôle positif identifie le calculateur du barrel comme hérité, et distingue le moteur courant de même nom. Aucune formule ni API R1 n'est modifiée.

Le programme TypeScript est limité aux racines protégées et à leurs dépendances, avec les deux modules de contrôle ; il n'a pas besoin de compiler les pages/tests sans rapport. Le contrôle ne constitue pas une preuve de sécurité contre toute réflexion JavaScript future, ni une suppression de l'API publique héritée. Sa non-utilisation frontend au SHA précédent reste établie par le graphe de la revue indépendante ; aucun nouvel import de ce moteur n'est ajouté.

## Vérifications et limites

ESLint conserve le workflow : comparaison par fichier au main `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`, mêmes dépendances, hors Edge. Aucune hausse par fichier et aucune suppression de règle. Déclaration source rafraîchie par la commande normale, attestations false.

Le premier run global lancé avec les autres contrôles lourds a dépassé le délai inchangé de 5 secondes dans trois tests FIT. Le même fichier isolé passe ses onze tests ; un seul rejeu global au calme est réalisé, avec les mêmes assertions et délais, sans modifier l'analyse FIT. Les deux journaux sont conservés ; le premier n'est pas déclaré réussi. La CI du SHA final est observée sans relance automatique.

Rendus testés avec le vrai composant React et ses contrôles, contexte/client neutralisés ; ce n'est pas une preuve de session ou persistance Supabase réelle. Les quatre checks GitHub du **SHA final exact**, leurs liens et le verdict sont consignés à clôture dans le corps de #425. PR maintenue DRAFT / NO-GO ; aucune fusion, migration ou activation. Aucun chantier suivant lancé automatiquement.
