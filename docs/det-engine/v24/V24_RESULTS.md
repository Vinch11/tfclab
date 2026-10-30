# V24 — DRAFT / NO-GO

## Amélioration fonctionnelle

Le moteur expérimental réutilise la chaîne existante et retient un séquençage différent pour B et deux contrefactuels éligibles : échange des sorties course en S3, après le plus grand bloc vélo déjà planifié. Aucun volume supplémentaire ni nouvel exercice. L'acceptation exige désormais l'absence de **tout nouveau témoin brut** d'avertissement/erreur, et pas seulement un compteur identique.

3 placements candidats retenus sur 8 cas, 6 jours de séances modifiés. 9 propositions avec compromis sont isolées pour le coach. 6 contrepropositions 90 minutes sont vérifiées comme blocs et restent rejetées par le floor historique. Le défaut de frontière commun à #424 est reproduit sans modification des calculateurs; les états corrigé candidat, incertain et absent ont des décisions de transport explicites.

| Cas figé | Placement retenu | Jours modifiés | Avertissements V23 → V24 | Erreurs historiques | Refus / conditions | Conflits capacité |
|---|---|---|---|---|---|---|
| A_aerobic | identique | 0 | 36 → 36 | 4 → 4 | 7 / 23 | 1 |
| B_sustainability | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 0 / 30 | 1 |
| C_uncertain | identique | 0 | 37 → 37 | 4 → 4 | 26 / 4 | 0 |
| B_changed_relevant_limiter | identique | 0 | 36 → 36 | 4 → 4 | 0 / 30 | 1 |
| B_missing_bike_reference | identique | 0 | 35 → 35 | 4 → 4 | 7 / 23 | 1 |
| B_lower_run_capacity | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 1 / 29 | 3 |
| B_adverse_recovery | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 1 / 29 | 1 |
| B_insufficient_differentiation | identique | 0 | 36 → 36 | 4 → 4 | 0 / 30 | 1 |

## Vérifications exécutées

| Commande | Tests réussis | Tests ignorés | Code sortie |
|---|---|---|---|
| build | 23 | 0 | 0 |
| replay | 23 | 0 | 0 |
| v23_non_regression | 25 | 0 | 0 |
| v22_non_regression | 27 | 0 | 0 |
| multiobjective_non_regression | 175 | 5 | 0 |
| types | compilation TypeScript | 0 | 0 |

23 tests V24, puis rejeu des mêmes 23; 227 tests de non-régression V23/V22/multiobjectifs réussis, 5 tests anciens explicitement ignorés. TypeScript sans émission : réussi. Le vérificateur Python indépendant contrôle arithmétique, sources, jours, fréquences, espacements, capacités, refus, identités d'alertes et trois artefacts de rejeu logiquement identiques.

Les 4 654 fichiers précédemment suivis sont inchangés. 920 IDs, 2 425 variantes, 600 configurations historiques, 96 chronologies / 51 IDs, 418 vues candidates et 15 fixtures Nolio sont conservés. Les 600 cas sont préservés et recomptés, **pas réexécutés** dans V24. Aucun appel Nolio; aucun export nouveau, API payante, donnée réelle, migration, fusion ou déploiement.

## Limites et essais rejetés

Une assertion initiale attendait un attribut nul au lieu du diagnostic global nul quand CE et allure manquent : corrigée sans changer le comportement. Le premier loader utilisait `replaceAll`, incompatible avec la cible TypeScript existante : remplacement lexical équivalent par regex. Les logs des échecs restent archivés. Une première acceptation par compteurs seulement a été abandonnée après inspection des témoins; aucune promotion de ces résultats exploratoires.

Les quatre semaines restent des réservations conditionnelles, pas une préparation Ironman complète. 32 erreurs historiques de portée intégrale et 9 conflits de capacité subsistent; A garde 7 refus course et C 26 refus. L'observation défavorable garde son refus. Une organisation plus explicable n'établit ni dose optimale, ni adaptation acquise, ni supériorité scientifique du placement.

**NO-GO maintenu.** La revue indépendante des références, du contrat 95/90 et des réactions individuelles est indispensable avant toute prescription utilisable.
