# Causes communes — cohorte fixe V17

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

Population : 700 IDs (299 partiels + 401 ambigus). Un ID peut apparaître dans plusieurs groupes ; les lignes ne s’additionnent pas. Les exemples et toutes les listes d’IDs sont dans [root-causes.json](evidence/validation-3/build/root-causes.json).

| Cause enregistrée V17 | IDs distincts | Exemples reproductibles |
|---|---|---|
| composite_or_nonleading_quantities | 415 | `A_BIKE_Z2_LONG`, `B_RUN_VMA_400`, `B_SWIM_SPEED_25` |
| execution_quantity_missing | 293 | `B_RUN_VMA_400`, `B_RUN_THRESHOLD`, `C_RUN_HILL_SKILLS` |
| last_recovery_occurrence_not_specified | 208 | `A_SWIM_AEROBIC`, `B_BIKE_VO2_3MIN`, `B_BIKE_THRESHOLD` |
| repetition_recovery_not_specified | 179 | `A_SWIM_AEROBIC`, `B_SWIM_SPEED_25`, `C_BIKE_CADENCE` |
| individual_elapsed_time_for_distance_unknown | 159 | `A_SWIM_AEROBIC`, `B_RUN_VMA_400`, `B_SWIM_SPEED_25` |
| brick_legs_or_transition_contract_unresolved | 62 | `BRICK_IM_Z2_RUN`, `BRICK_FAST_FINISH`, `BRICK_703_RACE_SIM` |
| conditional_or_alternative_execution | 49 | `A_TR_LONG_PROGRESSIVE`, `A_TR_LONG_DPLUS_2H`, `A_TR_LONG_PROGRESSIVE_Z3_FINISH` |
| multidiscipline_transition_and_occurrence_schedule_unresolved | 43 | `BRICK_IM_Z2_RUN`, `BRICK_FAST_FINISH`, `BRICK_703_RACE_SIM` |
| unresolved_execution | 37 | `A_SWIM_TRI_EASY_TECH_1500`, `B_SWIM_TRI_RACE_PACE_IM`, `B_SWIM_TRI_RACE_PACE_703` |
| external_repeat_recovery_unresolved | 37 | `A_SWIM_TRI_EASY_TECH_1500`, `B_SWIM_TRI_RACE_PACE_IM`, `B_SWIM_TRI_RACE_PACE_703` |
| additional_or_embedded_execution_unresolved | 13 | `A_TR_RACE_SIMU`, `A_TR_RACE_SIMU_90_120`, `A_TR50_RACE_SIMU_2H` |
| empty_instruction | 10 | `KENYAN_RUN_ALTITUDE_SIMULATION`, `TPL_IM_BIKE_RACE_SIM_6H`, `TPL_IM_BIKE_IRONMAN_SANDWICH` |
| integration_relationship_not_proven | 7 | `FATMAX_BIKE_FATFLUSH`, `CANOVA_RUN_PROGRESSIVE_LONG`, `CANOVA_TRI_BRICK_SPECIFIC` |
| unattributed_advertised_time_missing_peripheral_detail | 1 | `B_TR_FARTLEK_TRAIL_10x1_2` |
| advertised_duration_scope_preparation_unknown | 1 | `V2_RUN_MENTAL_FATIGUE` |


| Famille / hypothèse | Positif | Négatif | Risque et décision |
|---|---|---|---|
| Frontières lexicales des unités | `15' Z2 haut` contient 15 minutes, jamais 2 heures supplémentaires | `2h30` reste une durée réelle | Défaut logiciel démontré ; corriger les frontières, sans réécrire les zones |
| Quantité d’une activité nommée | `gainage doux 2min` contient une durée écrite | `gainage doux` n’en contient aucune | Ne pas inventer durée, charge ou équivalence avec la course |
| Cycle fermé / séries imbriquées | Travail + récupération écrits dans les crochets ; repos explicitement « entre séries » | `r=2min` sans occurrence finale | Résoudre uniquement la relation écrite ; pas de choix n−1/n pour entrer dans le créneau |
| Total avec phase finale | `60–90' Z2 avec 20' finish Z3` | `finish si frais` | Phase incluse, non ajoutée ; condition non résolue reste bloquante |
| Distance et cible relative | Distance nage + paramètre CSS séparé | CSS crawl appliquée à brasse ou éducatif | Paramètre de cible non converti en temps d’exécution |
| Transition | `<5min` donne une borne supérieure stricte, un minimum inconnu | Transition absente | Ni zéro ni durée implicite ajoutée |
| Variante de durée | Un seul nœud temporel source, variante entièrement quantitative | Recette warm-up / main / cool-down + durée isolée | Six liaisons candidates seulement ; aucune suppression implicite d’un composant |

Gain réalisé : 22 parties auparavant `unknown` devenues structurées, sur 21 IDs ; 8 chronologies supplémentaires. Les parties reconnues peuvent rester bloquées par une autre inconnue. [Détail par partie](evidence/validation-3/build/source-part-progress.json).

La réparation de grammaire bénéficie aux familles récurrentes ; elle ne suffit pas à compléter les sources qui ne précisent pas les repos, les consignes d’exercices ou les transitions. Aucun overlay sportif de correction de dose n’a été appliqué.
