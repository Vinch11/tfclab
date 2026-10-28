# Cas pilote — Ironman

Données et observations entièrement synthétiques. Calendriers partiels d’une semaine ; aucun plan de course complet ni validation experte.

## IM_reference

Objectif :IM, ambition :finisher, niveau :trained. Diagnostic conservé :`{"executed": true, "confidenceGlobal": 0.6050000000000002, "dataCompleteness": 1, "limiters": [{"metric": "VLamax", "priority": 1, "status": "limiting", "value": 0.5, "target": 0.26, "weightedImpact": 87.69230769230768}], "uncertainty": ["Confiance diagnostique limitée (61%)."]}`.

Témoin existant :`IM:trained:finisher:known_synthetic` / `standalone_preserve`, 16semaines ; empreinte `74b643f97977aa74fc3c8911c9d2fdc5b7bbd26682d222aa9f593dd66b86513b`. Mêmes entrées athlète :True, même diagnostic :True. Les différences de contraintes, courses intermédiaires et historique sont conservées dans le JSON. Aucune comparaison entre une semaine et le plan entier n’est présentée comme gain de conformité.

| Jour | Prescription source choisie |
|---|---|
| Lundi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mardi | A_SWIM_AEROBIC_MULTI_NAGES · 40min · zones sourceZ1,Z2 |
| Mercredi | A_SWIM_CONTINUOUS_2K · 40min · zones sourceZ1,Z2 |
| Jeudi | A_RUN_Z2_EASY · 60min · zones sourceZ1,Z2 |
| Vendredi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 40min · zones sourceZ1,Z2 |
| Samedi | RECOVERY_YOGA_MOBILITY_TRI · 30min · zones sourceZ1 |
| Dimanche | Sans dose prescrite ; ne prouve pas une récupération observée |

Volume proposé :210min ; fréquences physiques :`{"swim": 2, "bike": 0, "run": 2, "strength": 1}`. Contraintes mécaniques exécutées :`[]`. Obligations manquantes :`[{"sport": "bike", "required": 2, "placed": 0}]`. Prescription complète :**refusée**.

Erreurs historiques sur le préfixe :
- critical · quota_floor_violation : pas de SL vélo (≥90min) ni brick long (≥110min) en semaine load
- warning · quota_range_drift : bike hors fourchette (0 ∉ [2, 2])
- warning · quota_range_drift : total 5 hors fourchette [7, 9]
- warning · layout_drift : mardi: attendu bike+swim, observé swim
- warning · layout_drift : mercredi: attendu run+strength, observé swim
- warning · layout_drift : jeudi: attendu swim, observé run
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé strength
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- error · objective_sport_conflict : Objectif "IM" (multi-discipline) attend Vélo (45-55% du plan), mais 0 séance de Vélo sur l'ensemble du plan, sans contrainte explicite le justifiant (contraintes renseignées : « Profil synthétique QA — aucune contrainte, disponibilité large. ») — anomalie de génération à corriger avant utilisation (pas de substitution silencieuse d'une autre discipline).
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "V9 one-week prefix, not a complete race plan"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Endurance fondamentale, économie, récupération active"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage
- error · triathlon_discipline_continuity : Contrat sportif existant non respecté : triathlon_discipline_continuity
- error · triathlon_training_frequency : Contrat sportif existant non respecté : triathlon_training_frequency

Les erreurs de couverture/calendrier de compétition attestent notamment que le préfixe n’est pas un plan complet. Les erreurs de dose, continuité, catégories ou quotas restent également visibles ; elles ne sont pas annulées par les passes mécaniques.

Feedback :35scénarios indépendants et1trajectoire séquentielle. Toute observation est étiquetée synthétique. Les profils refusés n’ont pas de réponse à une séance non prescrite simulée.

Proposition rejetée :{'source': 'LYDIARD_RUN_AEROBIC_BASE_MEDIUM', 'minutes': 40} → {'source': 'A_RUN_Z2_EASY', 'minutes': 35}. Non-régression critique :False. Action effective :coach_review. Aucune application.
## IM_glycolytic

Objectif :IM, ambition :finisher, niveau :trained. Diagnostic conservé :`{"executed": true, "confidenceGlobal": 0.15, "dataCompleteness": 0.57, "limiters": [], "uncertainty": ["Données physiologiques incomplètes (57%).", "Confiance diagnostique limitée (15%).", "Aucun limiteur classable avec les données disponibles."]}`.

Témoin existant :`IM:trained:finisher:known_synthetic` / `standalone_preserve`, 16semaines ; empreinte `74b643f97977aa74fc3c8911c9d2fdc5b7bbd26682d222aa9f593dd66b86513b`. Mêmes entrées athlète :False, même diagnostic :False. Les différences de contraintes, courses intermédiaires et historique sont conservées dans le JSON. Aucune comparaison entre une semaine et le plan entier n’est présentée comme gain de conformité.

| Jour | Prescription source choisie |
|---|---|
| Lundi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mardi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mercredi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Jeudi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Vendredi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Samedi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Dimanche | Sans dose prescrite ; ne prouve pas une récupération observée |

Volume proposé :0min ; fréquences physiques :`{"swim": 0, "bike": 0, "run": 0, "strength": 0}`. Contraintes mécaniques exécutées :`[]`. Obligations manquantes :`[{"sport": "swim", "required": 2, "placed": 0}, {"sport": "bike", "required": 2, "placed": 0}, {"sport": "run", "required": 2, "placed": 0}, {"sport": "strength", "required": 1, "placed": 0}]`. Prescription complète :**refusée**.

Erreurs historiques sur le préfixe :
- critical · quota_floor_violation : swim < minSwimPerWeek (0 < 2)
- critical · quota_floor_violation : pas de SL vélo (≥90min) ni brick long (≥110min) en semaine load
- critical · quota_floor_violation : pas de SL CAP (≥60min) en semaine load
- critical · quota_floor_violation : strength < minStrengthPerWeek (0 < 1)
- warning · quota_range_drift : swim hors fourchette (0 ∉ [2, 2])
- warning · quota_range_drift : bike hors fourchette (0 ∉ [2, 2])
- warning · quota_range_drift : run hors fourchette (0 ∉ [2, 3])
- warning · quota_range_drift : strength hors fourchette (0 ∉ [1, 1])
- warning · quota_range_drift : total 0 hors fourchette [7, 9]
- warning · layout_drift : mardi: attendu bike+swim, observé rest
- warning · layout_drift : mercredi: attendu run+strength, observé rest
- warning · layout_drift : jeudi: attendu swim, observé rest
- warning · layout_drift : vendredi: attendu run, observé rest
- warning · layout_drift : samedi: attendu brick, observé rest
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- warning · race_day : ⚠️ Race Week sous-peuplée — S1 : seulement 0 séance(s) réelle(s) sur 4 attendues
- warning · strength_sessions_requested : S1: 0 séance(s) de renforcement vs 1 demandée(s) par le coach (Δ-1)
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "V9 one-week prefix, not a complete race plan"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage
- error · triathlon_discipline_continuity : Contrat sportif existant non respecté : triathlon_discipline_continuity
- error · triathlon_training_frequency : Contrat sportif existant non respecté : triathlon_training_frequency

Les erreurs de couverture/calendrier de compétition attestent notamment que le préfixe n’est pas un plan complet. Les erreurs de dose, continuité, catégories ou quotas restent également visibles ; elles ne sont pas annulées par les passes mécaniques.

Feedback :0scénarios indépendants et0trajectoire séquentielle. Toute observation est étiquetée synthétique. Les profils refusés n’ont pas de réponse à une séance non prescrite simulée.

La répartition égale de l’enveloppe limite fortement les doses vélo admissibles dans le catalogue actuel. Ce refus opérationnel n’est pas une preuve que l’athlète ne peut pas préparer unIronman. Les trois disciplines ne sont donc pas toutes effectivement prescrites dans ce préfixe et aucune continuitéIronman n’est déclarée acquise. Des variantes d’allocation pourraient être étudiées plus tard sans supprimer les obligations.
