# Deux microcycles archivés, réexaminés sans modification

Expérimental — DRAFT / NO-GO. Sources préservées, propositions non approuvées. Aucun appel réel Nolio, aucune donnée athlète.

Il s’agit de deux semaines synthétiques V10 conservées, pas de nouveaux plans validés. Les doses et toutes les autres séances restent inchangées. Les validateurs historiques et expérimentaux sont relancés ; le contrôle technique retrouve une erreur de portée parce que ces préfixes ne contiennent qu’une semaine pour une préparation déclarée de seize semaines. Cette erreur n’est ni cachée ni transformée en erreur physiologique.

## IM_aerobic_history — 480 min

| Jour (0=lundi) | ID historique | Dose archivée | Classe recette source | Examen exact de cette dose |
| --- | --- | --- | --- | --- |
| 1 | V3_BIKE_Z2_ENDURANCE_LONG | 180 min | complete | Filtres techniques exécutés sans erreur ; admission individuelle non attestée |
| 1 | A_SWIM_CONTINUOUS_2K | 40 min | partial | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 2 | C_IM_AERO_HOLD | 80 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 3 | A_RUN_Z2_EASY | 70 min | complete | Filtres techniques exécutés sans erreur ; admission individuelle non attestée |
| 4 | LYDIARD_RUN_AEROBIC_BASE_MEDIUM | 40 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 5 | RECOVERY_YOGA_MOBILITY_TRI | 30 min | descriptive_non_metabolic | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 6 | A_SWIM_AEROBIC_MULTI_NAGES | 40 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |

| Sévérité | Code | Portée |
| --- | --- | --- |
| warning | layout_drift | mercredi: attendu run+strength, observé bike |
| warning | layout_drift | jeudi: attendu swim, observé run |
| warning | layout_drift | vendredi: attendu qualité (isKeySession), observé séance non-clé |
| warning | layout_drift | samedi: attendu brick, observé strength |
| warning | layout_drift | dimanche: attendu run, observé swim |
| error | race_day | 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF" |
| error | title_format | Titre H1 non conforme au gabarit RÈGLE #0 : "Préfixe expérimental semaine1" |
| warning | key_session_self_declaration_mismatch | S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Développement aérobie fondamental — sortie longue Z2" |
| warning | key_session_self_declaration_mismatch | S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Endurance fondamentale, économie, récupération active" |
| error | calendar_coverage | Contrat sportif existant non respecté : calendar_coverage |
| error | triathlon_discipline_continuity | Contrat sportif existant non respecté : triathlon_discipline_continuity |
| error | triathlon_training_frequency | Contrat sportif existant non respecté : triathlon_training_frequency |

Contrôle technique : calendar_not_complete_and_unique. Aucun candidat V19 appliqué. Un témoin générique de source (par exemple 40 minutes) n’est pas la dose unique de cette fiche : l’examen exact de la dose archivée figure dans le résultat, sans la remplacer par ce témoin.

## IM_balanced_history — 480 min

| Jour (0=lundi) | ID historique | Dose archivée | Classe recette source | Examen exact de cette dose |
| --- | --- | --- | --- | --- |
| 1 | V3_BIKE_Z2_PROGRESSIF | 120 min | partial | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 1 | A_SWIM_CONTINUOUS_2K | 40 min | partial | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 2 | C_IM_AERO_HOLD | 75 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 3 | A_RUN_Z2_EASY | 90 min | complete | Filtres techniques exécutés sans erreur ; admission individuelle non attestée |
| 4 | LYDIARD_RUN_AEROBIC_BASE_MEDIUM | 70 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 5 | RECOVERY_YOGA_MOBILITY_TRI | 30 min | descriptive_non_metabolic | recipe_not_fully_compiled; no_source_bounded_duration_assignment |
| 6 | A_SWIM_AEROBIC_MULTI_NAGES | 55 min | ambiguous | recipe_not_fully_compiled; no_source_bounded_duration_assignment |

| Sévérité | Code | Portée |
| --- | --- | --- |
| warning | layout_drift | mercredi: attendu run+strength, observé bike |
| warning | layout_drift | jeudi: attendu swim, observé run |
| warning | layout_drift | vendredi: attendu qualité (isKeySession), observé séance non-clé |
| warning | layout_drift | samedi: attendu brick, observé strength |
| warning | layout_drift | dimanche: attendu run, observé swim |
| error | race_day | 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF" |
| error | title_format | Titre H1 non conforme au gabarit RÈGLE #0 : "Préfixe expérimental semaine1" |
| warning | key_session_self_declaration_mismatch | S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Sortie Z2 progressive — montée en puissance graduelle" |
| warning | key_session_self_declaration_mismatch | S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Endurance fondamentale, économie, récupération active" |
| error | calendar_coverage | Contrat sportif existant non respecté : calendar_coverage |
| error | triathlon_discipline_continuity | Contrat sportif existant non respecté : triathlon_discipline_continuity |
| error | triathlon_training_frequency | Contrat sportif existant non respecté : triathlon_training_frequency |

Contrôle technique : calendar_not_complete_and_unique. Aucun candidat V19 appliqué. Un témoin générique de source (par exemple 40 minutes) n’est pas la dose unique de cette fiche : l’examen exact de la dose archivée figure dans le résultat, sans la remplacer par ce témoin.
