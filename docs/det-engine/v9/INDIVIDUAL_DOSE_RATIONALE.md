# Justification des doses initiales

La justification est une règle de décision prospective explicite, pas une validation scientifique du nombre de minutes.

L’enveloppe hebdomadaire vient du contrat coach existant ; pour le trail avec historique connu, elle est bornée par les420minutes récentes de la fixture. La part par demande est la division entière de cette enveloppe par le nombre de séances requises. Une longue séance conserve au moins le floor existant, sans dépasser le budget global. Cette allocation égale est une convention expérimentale discutable, pas un modèle optimalIronman.

La dose choisie est la plus basse borne catalogue respectant le rôle, le plafond prévu et les contrôles exécutés, avec priorité à la diversité admissible. Le seuil inférieur d’une fiche n’est pas la preuve d’une capacité individuelle acquise. En l’absence d’historiqueIronman, ces doses restent des essais conditionnels à la revue coach ; elles ne démontrent pas une tolérance aux longues charges.

Les répétitions sont limitées par les plafonds catalogue et par le contrôle historique des doublons. La correction évite un ID déjà utilisé dans ce microcycle plutôt que supprimer l’alerte historique. Une dose de brick non mesurée n’est jamais convertie en endurance vélo autonome.

## IM_reference

Budget :480min. Historique récent connu :Nonemin. Niveau :trained. Limiteur prioritaire :VLamax. Incertitudes :Confiance diagnostique limitée (61%)..

| Demande avant sélection | Rôle / adaptation | Domaine plafond | Bornes prévues min | Résultat calculé |
|---|---|---|---|---|
| IM_reference:swim:0 | background_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 0–68 | A_SWIM_AEROBIC_MULTI_NAGES · 40min ; bornes source[40, 55] |
| IM_reference:swim:1 | background_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 0–68 | A_SWIM_CONTINUOUS_2K · 40min ; bornes source[40, 55] |
| IM_reference:bike:0 | long_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 90–90 | REFUS : no_admissible_catalogue_dose_in_prospective_envelope |
| IM_reference:bike:1 | background_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 0–68 | REFUS : no_admissible_catalogue_dose_in_prospective_envelope |
| IM_reference:run:0 | long_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 60–68 | A_RUN_Z2_EASY · 60min ; bornes source[35, 90] |
| IM_reference:run:1 | background_endurance : moderate aerobic endurance support; no quantitative VLamax reduction claimed | moderate_lt1 | 0–68 | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 40min ; bornes source[40, 70] |
| IM_reference:strength:0 | support_skill : movement/neuromuscular support hypothesis, not a diagnosed economy deficit | recovery | 0–68 | RECOVERY_YOGA_MOBILITY_TRI · 30min ; bornes source[30, 45] |
## IM_glycolytic

Budget :480min. Historique récent connu :Nonemin. Niveau :trained. Limiteur prioritaire :non classable. Incertitudes :Données physiologiques incomplètes (57%). ; Confiance diagnostique limitée (15%). ; Aucun limiteur classable avec les données disponibles..

| Demande avant sélection | Rôle / adaptation | Domaine plafond | Bornes prévues min | Résultat calculé |
|---|---|---|---|---|
| IM_glycolytic:swim:0 | background_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 0–68 | REFUS : no_classifiable_limiter |
| IM_glycolytic:swim:1 | background_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 0–68 | REFUS : no_classifiable_limiter |
| IM_glycolytic:bike:0 | long_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 90–90 | REFUS : no_classifiable_limiter |
| IM_glycolytic:bike:1 | background_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 0–68 | REFUS : no_classifiable_limiter |
| IM_glycolytic:run:0 | long_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 60–68 | REFUS : no_classifiable_limiter |
| IM_glycolytic:run:1 | background_endurance : general aerobic support; specific causal target unproven | moderate_lt1 | 0–68 | REFUS : no_classifiable_limiter |
| IM_glycolytic:strength:0 | support_skill : movement/neuromuscular support hypothesis, not a diagnosed economy deficit | recovery | 0–68 | REFUS : no_classifiable_limiter |
## Trail_known_history

Budget :420min. Historique récent connu :420min. Niveau :trained. Limiteur prioritaire :TTE. Incertitudes :Données physiologiques incomplètes (60%). ; Confiance diagnostique limitée (50%)..

| Demande avant sélection | Rôle / adaptation | Domaine plafond | Bornes prévues min | Résultat calculé |
|---|---|---|---|---|
| Trail_known_history:run:0 | long_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 120–120 | REFUS : individual_vertical_eccentric_tolerance_unknown |
| Trail_known_history:run:1 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–84 | A_RUN_Z2_EASY · 35min ; bornes source[35, 90] |
| Trail_known_history:run:2 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–84 | SEILER_RUN_Z1_EASY_LONG · 70min ; bornes source[70, 150] |
| Trail_known_history:run:3 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–84 | REFUS : no_admissible_catalogue_dose_in_prospective_envelope |
| Trail_known_history:strength:0 | support_skill : movement/neuromuscular support hypothesis, not a diagnosed economy deficit | recovery | 0–84 | D_TR_REST_MOBILITY · 15min ; bornes source[15, 25] |
| Trail_known_history:targeted_TTE | targeted_threshold : threshold sustainability hypothesis; no dose inferred from TTE45 alone | mlss | 0–84 | REFUS : no_individual_threshold_dose_tolerance_evidence |
## Trail_unknown_history

Budget :600min. Historique récent connu :Nonemin. Niveau :trained. Limiteur prioritaire :TTE. Incertitudes :Données physiologiques incomplètes (60%). ; Confiance diagnostique limitée (50%)..

| Demande avant sélection | Rôle / adaptation | Domaine plafond | Bornes prévues min | Résultat calculé |
|---|---|---|---|---|
| Trail_unknown_history:run:0 | long_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 120–120 | REFUS : recent_history_missing, individual_vertical_eccentric_tolerance_unknown |
| Trail_unknown_history:run:1 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–120 | REFUS : recent_history_missing |
| Trail_unknown_history:run:2 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–120 | REFUS : recent_history_missing |
| Trail_unknown_history:run:3 | background_endurance : aerobic foundation supporting later threshold sustainability; not a durability measurement | moderate_lt1 | 0–120 | REFUS : recent_history_missing |
| Trail_unknown_history:strength:0 | support_skill : movement/neuromuscular support hypothesis, not a diagnosed economy deficit | recovery | 0–120 | REFUS : recent_history_missing |
| Trail_unknown_history:targeted_TTE | targeted_threshold : threshold sustainability hypothesis; no dose inferred from TTE45 alone | mlss | 0–120 | REFUS : no_individual_threshold_dose_tolerance_evidence |

Les deux profilsIronman gardent le même objectif/niveau/ambition, mais le second n’a aucun limiteur classable et reçoit un refus. Les deux profilstrail conservent les mêmes mesures et le même niveau ; seul l’historique récent est retiré dans le témoin. Le résultat différencie donc effectivement la prescription et le refus sans fabriquer une donnée manquante. Ce contraste ne prouve pas l’efficacité d’un dosage physiologique continu : aucune formule quantitative n’est validée.
