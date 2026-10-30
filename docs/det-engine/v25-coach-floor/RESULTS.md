# Décision coach après V25 — DRAFT / NO-GO

**Critère démontré :** l'opt-in construit six alternatives complètes de 90 minutes sous votre autorisation du floor, sans changer la recette, la variante ou l'enveloppe déclarée. Les consignes d'exécution sont bornées à Z1 strict; les cibles numériques proviennent exclusivement des anciennes cibles Z1, ou restent absentes lorsque la référence est bloquée.

| Cas figé | Dérogation appliquée à l’alternative | Minutes S3 course longue | Dépassements d’enveloppe avant → après | Erreurs / avertissements bruts avant → après | Refus individuels conservés |
|---|---|---|---|---|---|
| A_aerobic | True | 95 → 90 | 1 → 0 | [4, 36] → [5, 36] | 7 |
| B_sustainability | True | 95 → 90 | 1 → 0 | [4, 34] → [5, 34] | 0 |
| C_uncertain | False | inchangées | 0 → 0 | [4, 37] → [4, 37] | 26 |
| B_changed_relevant_limiter | True | 95 → 90 | 1 → 0 | [4, 36] → [5, 36] | 0 |
| B_missing_bike_reference | True | 95 → 90 | 1 → 0 | [4, 35] → [5, 35] | 7 |
| B_lower_run_capacity | False | inchangées | 3 → 3 | [4, 34] → [4, 34] | 1 |
| B_adverse_recovery | True | 95 → 90 | 1 → 0 | [4, 34] → [5, 34] | 1 |
| B_insufficient_differentiation | True | 95 → 90 | 1 → 0 | [4, 36] → [5, 36] | 0 |

## Mesures vérifiées

- 1 décision de politique coach enregistrée, sans signature inventée.
- 8 références V25 inchangées et 6 alternatives autorisées pour programmation expérimentale.
- 6 réductions de 95 à 90 minutes, aucun autre changement de durée ou de placement, aucune compensation de volume.
- 9 → 3 dépassements d'enveloppe dans la projection comparative, dus à la réduction de dose; aucune adaptation présumée.
- 42 refus individuels conservés, notamment les sept refus course de A et la suspension vélo S2.
- 18 témoins bruts du conflit de floor conservés (3 par alternative); aucun nouveau défaut hors de cette dérogation.
- 29 tests nouveaux, leur rejeu, 290 tests de non-régression, TypeScript et vérifications indépendantes réussis.
- 15 fixtures V25 rejouées à résultats identiques; 0 approbation de dose et 0 revue experte individuelle attestée.

L'absence d'opt-in, 75 minutes, une recette tronquée, une capacité inconnue, un autre plancher, objectif, source ou contexte restent refusés. La politique est limitée au cas de référence et aux fixtures expérimentales ; aucune généralisation automatique.

Votre décision résout l'autorisation du plancher, **pas** les inconnues de tolérance, d'intensité individuelle, de récupération ou de références physiologiques. Ces conditions restent à documenter avant une prescription utilisable. Le statut demeure NO-GO, sans modification de production ni approbation individuelle.
