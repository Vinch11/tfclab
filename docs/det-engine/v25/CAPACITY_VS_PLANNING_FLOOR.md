# Capacité, recette et plancher de programmation

Le moteur ne confond plus la recevabilité d'une proposition de dérogation avec une dose autorisée. La lecture V24 reste conservée; une **évaluation complémentaire V25**, nommée `det-v25-complementary-floor-review-1`, décrit ce qui peut être soumis à une décision humaine.

## Six dimensions explicites

| Champ | Valeur pour l’alternative S3 | Portée réelle |
|---|---|---|
| source_recipe_minimum | 60 min | bloc continu historique avec périphériques intégrés; métadonnée catalogue minimale distincte : 70 min |
| goal_variant_minimum | 90 min | variante Ironman littérale 90–120 min Z1 strict |
| planning_floor | 95 min | convention native individualisée, conservée sans modification |
| current_capacity_envelope | 90 min | enveloppe coach synthétique préenregistrée; pas une adaptation obtenue |
| individual_tolerance_verified | false | aucune preuve individuelle de tolérance à cette recette exacte |
| coach_override_status | pending_explicit_decision | aucune approbation humaine enregistrée |

La validité physiologique du stimulus reste une question distincte : le contexte familial documenté en V21 ne valide ni cette dose exacte ni son applicabilité individuelle. Une adaptation future est une possibilité conditionnelle, jamais une capacité acquise.

La preuve V24 est réutilisée avec l'identité complète de la fiche. Échauffement et retour au calme de 10 minutes sont intégrés, jamais ajoutés ou tronqués. V25 réexécute le contrat catalogue et le contexte de placement originaux. La compatibilité de variante annoncée porte sur sa durée et la conservation des consignes; l'affectation individuelle exacte de l'intensité reste non vérifiée. La consigne Z1 stricte n'est pas transformée en autorisation générale Z2.

| Fixture | Minutes | Recette complète | Variante IM, durée | Dans enveloppe | Statut |
|---|---|---|---|---|---|
| 95_over_90 | 95 | True | True | False | not_currently_admissible |
| 90_floor_candidate | 90 | True | True | True | candidate_planning_floor_exception |
| 75_below_goal_min | 75 | True | False | True | not_currently_admissible |
| missing_component_reduction | 20 | False | False | True | not_currently_admissible |
| unknown_capacity | 90 | True | True | False | not_currently_admissible |

À 75 minutes, le contenu continu de base peut entrer dans la plage source et la métadonnée 70–150, mais la variante Ironman 90–120 est incompatible. Une diminution d'une autre recette qui perdrait une partie obligatoire est refusée. Une capacité inconnue n'est jamais traitée comme un plafond favorable.

## Vérification sur les blocs complets

Neuf conflits d'enveloppe donnent lieu à des examens; six alternatives à 90 minutes sont techniquement recevables pour instruire une exception strictement limitée au floor. Les trois réductions à 75 minutes du contrefactuel restent bloquées. Les 240 réservations retenues restent identiques à V24, dont la course candidate de 95 minutes, toujours au-delà de l'enveloppe actuelle de 90.

Chaque contreproposition complète conserve **trois témoins** du même conflit : `original_weekly_quota_or_budget` avec `quota_floor_violation`, `four_week_native_floor`, et sa restitution historique `historical_error_not_explained_by_scope`. Le complément lie exactement semaine, slot, source, durée, capacité et floor; un autre quota ou défaut reste une erreur distincte. Aucun témoin brut n'est effacé : ces contrepropositions ont toujours 5 erreurs historiques, contre 4 dans la réservation native.

Leur S3 utilise 500 minutes au lieu de 505, sans compensation des 5 minutes retirées. Ce sont des alternatives, pas les calendriers retenus. La recevabilité technique de A ne retire aucun de ses sept refus course; celle du cas de récupération défavorable ne lève pas sa suspension vélo.
