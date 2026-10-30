# Reprise DET-ENGINE V8

Lire `state.json`, `V8_RESULTS.md`, `SCIENTIFIC_EVIDENCE_MATRIX.md`, `LORANG_METHODOLOGY.md`, `SPORT_SCIENCE_REVIEW.md`, `PROPOSED_SPORT_CONTRACTS.md`. Branche exclusive `experiment/det-engine`, PR420 brouillon, NO-GO.

## Reprise technique

Vérifier l’absence de modifications étrangères, les empreintes `baseline-files.json` et `checksums.json`, le HEAD et la branche de PR. Une unité active impose d’identifier le processus avant toute relance. `v8-run.mjs` refuse unité inconnue, active, déjà terminée, plus de3tentatives ou dépassement du budget. Rejeu manuel explicite des comparaisons sans doublons de lignes : les fichiers sont déterministes, pas append-only.

Commandes offline :

```sh
node --test experimental/det-engine/v8-causal-audit.test.mjs
node scripts/det-engine/v8-compare.mjs
node scripts/det-engine/v8-run.mjs validation scripts/det-engine/v8-validate.mjs
```

Le comparateur est autorisé uniquement avant l’échéance V8 ; une session ultérieure doit créer son propre registre borné et préserver les preuves V8. Le runner ne constitue pas un développement permanent. Le fichier de validation efface les variables opt-in pour ne pas relancer involontairement toutes les simulations ; les exécutions de matrices distinctes doivent être citées séparément.

## Prochain travail réellement utile

Ajouter un lien explicite entre intention catalogue et adaptation prioritaire avec provenance et critères de dose, puis tester si les séances choisies servent effectivement ce lien. Ne pas fabriquer des justifications a posteriori. En l’absence de preuve suffisante, continuer à retourner une inconnue. Le prototype V8 rend ce manque mesurable ; il n’a pas résolu l’optimisation des doses Ironman ni validé les modèles trail.

Les raisonnements de dose et les changements méthodologiques doivent être proposés avec exceptions, données et preuves. Décisions humaines : règles de distribution par objectif/phase/niveau ; exigences des longues doses Ironman ; adéquation des phases/A-B trail, verticalité et affûtage. La revue doit aussi examiner le statut des estimations VLamax/TTE et leur incertitude. Aucune promotion de doctrine sans cette décision.

Les capacités de production et Coach Preview applicative ne changent pas. Les quatre dossiers restent des supports offline. Aucun test automatisé ne vaut revue experte.
