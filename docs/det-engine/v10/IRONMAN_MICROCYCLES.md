# Deux microcyclesIronman complets — hypothèse candidate

Chacun remplit les sept rôles, conserve natation/vélo/course à deux présences physiques chacune et un soutien de mouvement. Les limites historiques et scientifiques ci-dessous empêchent toute déclaration de validation sportive générale.

## IM_aerobic_history

Statut technique :constructed. Budget déclaré :600min ; plafond exécuté :480min ; utilisation :480min ; reliquat :0min.

| Jour | Séances source, dose et rôle |
|---|---|
| Lundi | Aucune dose programmée ; ne prouve pas une récupération observée |
| Mardi | V3_BIKE_Z2_ENDURANCE_LONG · 180min · long · zonesZ1,Z2 ; A_SWIM_CONTINUOUS_2K · 40min · endurance · zonesZ1,Z2 |
| Mercredi | C_IM_AERO_HOLD · 80min · technical · zonesZ2,Z1 |
| Jeudi | A_RUN_Z2_EASY · 70min · long · zonesZ1,Z2 |
| Vendredi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 40min · endurance · zonesZ1,Z2 |
| Samedi | RECOVERY_YOGA_MOBILITY_TRI · 30min · skill · zonesZ1 |
| Dimanche | A_SWIM_AEROBIC_MULTI_NAGES · 40min · endurance · zonesZ1,Z2 |

| Rôle | Adaptation hypothétique | Dose min/choisie/max | Priorité |
|---|---|---|---:|
| IM_aerobic_history:strength:0 | movement support, no force-dose efficacy claim | 30/30/40 | 12 |
| IM_aerobic_history:bike:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 180/180/180 | 0 |
| IM_aerobic_history:bike:1 | aero-position skill/endurance, explicitly not autonomous long endurance | 75/80/80 | 2 |
| IM_aerobic_history:swim:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/40/55 | 11 |
| IM_aerobic_history:swim:1 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/40/55 | 11 |
| IM_aerobic_history:run:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 60/70/75 | 10 |
| IM_aerobic_history:run:1 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/40/70 | 11 |

Les minima sont réservés avant les extensions ; chaque extension et le reliquat sont enregistrés dans allocationLog. Les contrôles de phase, catalogue, niveau, contexte source et prérequis restent actifs. Les domaines d’intensité sont ceux de la doctrineTFCL.

Contrôles candidat :[]. Couverture :passes_executed_constraints. Les sources d’endurance longue et de position restent distinctes ; aucun brick non mesuré n’est utilisé.

### Contrôles historiques inchangés

Les routines de plan complet sont aussi appelées sur le microcycle de sept jours dans le contexte de préparation. Les erreurs restent brutes :
- warning · layout_drift : mercredi: attendu run+strength, observé bike
- warning · layout_drift : jeudi: attendu swim, observé run
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé strength
- warning · layout_drift : dimanche: attendu run, observé swim
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "Préfixe expérimental semaine1"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Développement aérobie fondamental — sortie longue Z2"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Endurance fondamentale, économie, récupération active"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage
- error · triathlon_discipline_continuity : Contrat sportif existant non respecté : triathlon_discipline_continuity
- error · triathlon_training_frequency : Contrat sportif existant non respecté : triathlon_training_frequency

**Limite de portée** : certaines routines déduisent une semaine de compétition d’un préfixe d’une semaine. L’absence d’erreur d’intensité ne prouve donc pas le passage du contrôle de phasebase historique. Les métriques et cet avertissement sont conservés dans legacyWeekMetrics/coverageWarning. Les contrôles source de zones, les quotas et les contraintes du candidat sont séparés ; aucune routine historique n’a été modifiée ou désactivée.

Le titre du préfixe n’est pas celui d’un plan complet ; son erreur de format est conservée. Un microcycle complet n’est ni un planIronman complet ni une conformité aux anciens validateurs de plan complet. Aucune revue experte ou tolérance clinique n’est attestée.

Les jours sans séance, l’espacement candidat des longues et les récupérations explicitement écrites dans les fiches sont visibles. Les sensations, RPE, alimentation, récupération réelle et effets d’interférence restent à observer ; ils ne sont pas déduits des minutes.

## IM_balanced_history

Statut technique :constructed. Budget déclaré :600min ; plafond exécuté :480min ; utilisation :480min ; reliquat :0min.

| Jour | Séances source, dose et rôle |
|---|---|
| Lundi | Aucune dose programmée ; ne prouve pas une récupération observée |
| Mardi | V3_BIKE_Z2_PROGRESSIF · 120min · long · zonesZ1,Z2 ; A_SWIM_CONTINUOUS_2K · 40min · endurance · zonesZ1,Z2 |
| Mercredi | C_IM_AERO_HOLD · 75min · technical · zonesZ2,Z1 |
| Jeudi | A_RUN_Z2_EASY · 90min · long · zonesZ1,Z2 |
| Vendredi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 70min · endurance · zonesZ1,Z2 |
| Samedi | RECOVERY_YOGA_MOBILITY_TRI · 30min · skill · zonesZ1 |
| Dimanche | A_SWIM_AEROBIC_MULTI_NAGES · 55min · endurance · zonesZ1,Z2 |

| Rôle | Adaptation hypothétique | Dose min/choisie/max | Priorité |
|---|---|---|---:|
| IM_balanced_history:bike:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 120/120/120 | 10 |
| IM_balanced_history:strength:0 | movement support, no force-dose efficacy claim | 30/30/40 | 12 |
| IM_balanced_history:swim:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/55/55 | 11 |
| IM_balanced_history:swim:1 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/40/55 | 11 |
| IM_balanced_history:bike:1 | aero-position skill/endurance, explicitly not autonomous long endurance | 75/75/80 | 12 |
| IM_balanced_history:run:0 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 60/90/90 | 0 |
| IM_balanced_history:run:1 | moderate aerobic endurance hypothesis in declared limiting-discipline context; no predicted VLamax change | 40/70/70 | 1 |

Les minima sont réservés avant les extensions ; chaque extension et le reliquat sont enregistrés dans allocationLog. Les contrôles de phase, catalogue, niveau, contexte source et prérequis restent actifs. Les domaines d’intensité sont ceux de la doctrineTFCL.

Contrôles candidat :[]. Couverture :passes_executed_constraints. Les sources d’endurance longue et de position restent distinctes ; aucun brick non mesuré n’est utilisé.

### Contrôles historiques inchangés

Les routines de plan complet sont aussi appelées sur le microcycle de sept jours dans le contexte de préparation. Les erreurs restent brutes :
- warning · layout_drift : mercredi: attendu run+strength, observé bike
- warning · layout_drift : jeudi: attendu swim, observé run
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé strength
- warning · layout_drift : dimanche: attendu run, observé swim
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "Préfixe expérimental semaine1"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Sortie Z2 progressive — montée en puissance graduelle"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Endurance fondamentale, économie, récupération active"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage
- error · triathlon_discipline_continuity : Contrat sportif existant non respecté : triathlon_discipline_continuity
- error · triathlon_training_frequency : Contrat sportif existant non respecté : triathlon_training_frequency

**Limite de portée** : certaines routines déduisent une semaine de compétition d’un préfixe d’une semaine. L’absence d’erreur d’intensité ne prouve donc pas le passage du contrôle de phasebase historique. Les métriques et cet avertissement sont conservés dans legacyWeekMetrics/coverageWarning. Les contrôles source de zones, les quotas et les contraintes du candidat sont séparés ; aucune routine historique n’a été modifiée ou désactivée.

Le titre du préfixe n’est pas celui d’un plan complet ; son erreur de format est conservée. Un microcycle complet n’est ni un planIronman complet ni une conformité aux anciens validateurs de plan complet. Aucune revue experte ou tolérance clinique n’est attestée.

Les jours sans séance, l’espacement candidat des longues et les récupérations explicitement écrites dans les fiches sont visibles. Les sensations, RPE, alimentation, récupération réelle et effets d’interférence restent à observer ; ils ne sont pas déduits des minutes.


## Incertitudes propres aux deux dossiers

- IM_aerobic_history : confiance diagnostique0.6050000000000002, complétude1. Confiance diagnostique limitée (61%). Chronologie intégrale non attestée pour :RECOVERY_YOGA_MOBILITY_TRI, A_SWIM_AEROBIC_MULTI_NAGES, A_SWIM_CONTINUOUS_2K, LYDIARD_RUN_AEROBIC_BASE_MEDIUM. Les bornes totales catalogue restent exécutées, sans preuve clinique individuelle.
- IM_balanced_history : confiance diagnostique0.5, complétude0.64. Données physiologiques incomplètes (64%). ; Confiance diagnostique limitée (50%). Chronologie intégrale non attestée pour :RECOVERY_YOGA_MOBILITY_TRI, A_SWIM_AEROBIC_MULTI_NAGES, A_SWIM_CONTINUOUS_2K, LYDIARD_RUN_AEROBIC_BASE_MEDIUM. Les bornes totales catalogue restent exécutées, sans preuve clinique individuelle.
