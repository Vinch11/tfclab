# #418 — classement ciblé des refus résiduels

Les preuves ci-dessous sont calculées sur les mêmes entrées synthétiques, sans appel modèle. Une cause peut concerner plusieurs semaines ; les codes secondaires de layout ne sont pas additionnés comme des incidents distincts.

Configurations bloquées : **58** ; contradictions internes reproductibles dans ce classement : **0**.

| Objectif | Configurations bloquées |
|---|---:|
| 703 | 3 |
| 10K | 12 |
| 5K | 12 |
| IM | 5 |
| Marathon | 12 |
| Olympic | 2 |
| Semi | 12 |

Les nombres complets, bornes et alternatives de nombre de bricks sont dans `residual-classification.json`. Les motifs sont des conditions nécessaires des règles existantes, pas de nouvelles prescriptions.

| Configuration exacte | Ambition effective | Semaines refusées | Causes prouvées (union) | État |
|---|---|---|---|---|
| 703:highly_trained:competitor:unknown | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11, 12 | brick_strength_day_capacity, run_plus_brick_days | justified_capacity_refusal |
| 703:highly_trained:world_class:unknown | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| IM:trained:competitor:known_synthetic | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 20 | brick_strength_day_capacity, run_plus_brick_days | justified_capacity_refusal |
| IM:trained:elite:unknown | elite | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 | brick_strength_day_capacity, daily_session_capacity, run_plus_brick_days | justified_capacity_refusal |
| IM:highly_trained:world_class:unknown | world_class | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 | brick_strength_day_capacity, daily_session_capacity, run_plus_brick_days | justified_capacity_refusal |
| Olympic:trained:world_class:unknown | elite | 1, 2, 4, 5, 7, 8, 9 | brick_strength_day_capacity, run_plus_brick_days | justified_capacity_refusal |
| Olympic:highly_trained:elite:unknown | elite | 1, 2, 4, 5 | brick_strength_day_capacity, run_plus_brick_days | justified_capacity_refusal |
| Marathon:trained:competitor:unknown | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15 | daily_session_capacity | justified_capacity_refusal |
| Marathon:trained:competitor:known_synthetic | competitor | 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 18, 19 | daily_session_capacity | justified_capacity_refusal |
| Marathon:trained:elite:unknown | elite | 1, 2, 4, 5, 7, 8, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Marathon:trained:elite:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15 | daily_session_capacity | justified_capacity_refusal |
| Marathon:trained:world_class:unknown | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19 | daily_session_capacity | justified_capacity_refusal |
| Marathon:trained:world_class:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:competitor:unknown | competitor | 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 18, 19 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:competitor:known_synthetic | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:elite:unknown | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:elite:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:world_class:unknown | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Marathon:highly_trained:world_class:known_synthetic | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:competitor:unknown | competitor | 1, 2, 4, 5, 7, 8, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:competitor:known_synthetic | competitor | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:elite:unknown | elite | 1, 2, 3, 5, 6, 7 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:elite:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:world_class:unknown | elite | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| Semi:trained:world_class:known_synthetic | elite | 1, 2, 3, 5, 6, 7 | daily_session_capacity | justified_capacity_refusal |
| Semi:highly_trained:competitor:unknown | competitor | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| Semi:highly_trained:competitor:known_synthetic | competitor | 1, 2, 3, 5, 6, 7 | daily_session_capacity | justified_capacity_refusal |
| Semi:highly_trained:elite:unknown | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| Semi:highly_trained:elite:known_synthetic | elite | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| Semi:highly_trained:world_class:unknown | world_class | 1, 2, 3, 4, 5, 6, 7, 8 | daily_session_capacity, run_plus_brick_days | justified_capacity_refusal |
| Semi:highly_trained:world_class:known_synthetic | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:competitor:unknown | competitor | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:competitor:known_synthetic | competitor | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:elite:unknown | elite | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:elite:known_synthetic | elite | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:world_class:unknown | elite | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 5K:trained:world_class:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:competitor:unknown | competitor | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:competitor:known_synthetic | competitor | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:elite:unknown | elite | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:elite:known_synthetic | elite | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:world_class:unknown | world_class | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 5K:highly_trained:world_class:known_synthetic | world_class | 1, 2, 3 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:competitor:unknown | competitor | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:competitor:known_synthetic | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:elite:unknown | elite | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:elite:known_synthetic | elite | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:world_class:unknown | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| 10K:trained:world_class:known_synthetic | elite | 1, 2, 4, 5 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:competitor:unknown | competitor | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:competitor:known_synthetic | competitor | 1, 2, 3, 5 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:elite:unknown | elite | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:elite:known_synthetic | elite | 1, 2, 4, 5, 7, 8, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:world_class:unknown | world_class | 1, 2, 4, 5 | daily_session_capacity | justified_capacity_refusal |
| 10K:highly_trained:world_class:known_synthetic | world_class | 1, 2, 3, 5, 6, 7, 9 | daily_session_capacity | justified_capacity_refusal |
| 703:highly_trained:world_class:unknown:lcw_3day | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11, 13 | daily_session_capacity | justified_capacity_refusal |
| IM:trained:elite:unknown:lcw_3day | elite | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |
| IM:highly_trained:world_class:unknown:lcw_3day | world_class | 1, 2, 3, 5, 6, 7, 9, 10, 11 | daily_session_capacity | justified_capacity_refusal |

## Couverture catalogue restante

Le pool non plafonné conserve les mêmes filtres et le même score d’admissibilité ; aucune phase, intensité, variante ou prohibition n’est élargie. Les fiches de chaque sport, durées, phases, intentions, zones, plafonds hebdomadaires explicites (null = absent), étapes d’exclusion et motifs hebdomadaires sont fournis dans le JSON.

| Configuration | Semaine / type | Sport | Minima | Fiches sélectionnées admissibles | Pool non plafonné admissible | Classement |
|---|---|---|---:|---|---|---|
| 703:light:competitor:unknown | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| 703:light:world_class:known_synthetic | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| 703:trained:age_group:unknown | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:light:age_group:known_synthetic | S3 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:light:world_class:unknown | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:trained:competitor:known_synthetic | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:trained:elite:unknown | S4 / base / recovery | brick | 2 | BRICK_STAGE1_INTRO | BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:highly_trained:world_class:unknown | S1 / base / load | brick | 3 | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:highly_trained:world_class:unknown | S2 / base / load | brick | 3 | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:highly_trained:world_class:unknown | S3 / base / load | brick | 3 | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | BRICK_ACTIVATION_PRE_RACE, BRICK_STAGE1_INTRO | limited_diversity_existing_repetition_rules |
| IM:highly_trained:world_class:unknown | S8 / peak / recovery | brick | 3 | D_BRICK_EASY_SHAKEOUT, BR_IM_STEADY_PRO | D_BRICK_EASY_SHAKEOUT, BR_IM_STEADY_PRO | limited_diversity_existing_repetition_rules |

**Limites et arbitrages** : refus d’agenda = choix coach sur les contraintes ou l’ambition, jamais hausse automatique de charge. Zéro fiche admissible = aucun protocole catalogue démontré pour ce rôle ; une variante/custom doit être explicitement autorisé et revu. Une insuffisance de diversité n’est pas une impossibilité de prescription démontrée. Les plans complets correspondants, l’enchaînement physiologique réel et la revue coach restent nécessaires ; les voies trail/S2R ne sont pas certifiées par leurs zéros de précontrôle.
