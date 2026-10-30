# Comparaison V23 / V24 — cohorte constante

Les 3 profils V22 et les 5 contrefactuels V23 sont identiques, vérifiés par comparaison des entrées complètes avant calcul. Le chemin V23 rejoué est égal à l'archive V23 complète, pas seulement à ses compteurs.

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

240 réservations examinées, 3 calendriers candidats modifiés, 6 changements de jour au total. Les 12 propositions de placement comprennent 3 retenues et 9 propositions coach distinctes. Toutes les doses, sources, fréquences, limites de capacité et consignes sont identiques aux calendriers de référence. Les intensités calculées et les refus restent identiques.

Les 32 erreurs historiques de portée préparation complète restent visibles : quatre par cas, sans attestation de préparation Ironman. Les 9 conflits d'enveloppe restent signalés. Aucun bloc n'est approuvé comme prescription individuelle. Les avertissements passent de 285 à 282; le détail par cas ci-dessus interdit de masquer un échec par agrégation.

Les calendriers complets avant/après sont dans `evidence/calendar-before-after.csv`; les résultats JSON contiennent les plans numériques, les recettes, les décisions et tous les contrôles. La première validation exploratoire ayant comparé seulement les totaux est conservée comme rejetée : `validation-1`, avec ses résultats et son échec TypeScript. Les registres V2–V23 restent inchangés.
