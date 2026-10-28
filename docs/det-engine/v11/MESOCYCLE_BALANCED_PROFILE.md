# Mésocycle candidat — IM_balanced_history

Statut technique : constructed. Bloc de quatre semaines complet, **pas un plan Ironman complet**. Aucun avis expert ni adaptation réelle démontrée. Modèle retenu pour examen :separated_exposures ; compact_reference reste archivé comme comparaison, sans conclusion d’efficacité.

Objectif Ironman, ambition finisher, niveau qualitatif trained, budget déclaré 600 min/semaine, mêmes six jours disponibles (mardi–dimanche), deux séances maximum/jour et au moins un jour de repos. Historique explicitement fictif : huit semaines à 600 min, enveloppes longues vélo 150/course 90 min. Ces enveloppes ne sont pas des mesures de tolérance.

Limiteur présumé : VLamax, estimation synthétique 0.55, confiance modèle 50%. Incertitudes : Données physiologiques incomplètes (64%).; Confiance diagnostique limitée (50%). Le focus run et les plafonds déjà documentés expliquent la répartition ; aucune fonction VLamax→dose ni prédiction de baisse n’est appliquée.

| Semaine/type | Natation | Vélo | Course | Soutien | Total | Plafond natif | Plafond candidat | Reliquat candidat |
|---|---|---|---|---|---|---|---|---|
| S1/load | 95 | 195 | 160 | 30 | 480 | 480 | 480 | 0 |
| S2/load | 95 | 195 | 160 | 30 | 480 | 528 | 480 | 0 |
| S3/load | 95 | 195 | 160 | 30 | 480 | 580 | 480 | 0 |
| S4/recovery | 80 | 85 | 55 | 30 | 250 | 447 | 336 | 86 |

Toutes les quantités ci-dessus sont en minutes prescrites. S2/S3 n’utilisent pas tout le plafond natif : aucun stimulus supplémentaire n’est justifié par des réponses futures encore inconnues. Le plafond candidat représente la politique de maintien de V10, augmentée uniquement si un plancher individuel natif l’exige. En S4, il applique aussi le plafond de récupération TFCL existant depuis la dernière charge effectivement programmée.

## Semaine 1 — load, phase base

Position 1/4 ; compétition à 111 jours du début de semaine selon les dates synthétiques existantes. Décision :repeat_tolerated_synthetic_envelope_no_automatic_increase.

| Jour | Séances réellement calculées |
|---|---|
| lundi | Repos · 0 min |
| mardi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 70 min · zones Z1,Z2 ; A_SWIM_CONTINUOUS_2K · 40 min · zones Z1,Z2 |
| mercredi | V3_BIKE_Z2_PROGRESSIF · 120 min · zones Z1,Z2 |
| jeudi | RECOVERY_YOGA_MOBILITY_TRI · 30 min · zones Z1 |
| vendredi | A_RUN_Z2_EASY · 90 min · zones Z1,Z2 |
| samedi | C_IM_AERO_HOLD · 75 min · zones Z2,Z1 |
| dimanche | A_SWIM_AEROBIC_MULTI_NAGES · 55 min · zones Z1,Z2 |

| Rôle/source | Domaine doctrine | Min / retenu / max (min) | Justification de dose |
|---|---|---|---|
| bike/long · V3_BIKE_Z2_PROGRESSIF | moderate_lt1 | 120/120/120 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| strength/skill · RECOVERY_YOGA_MOBILITY_TRI | recovery | 30/30/40 | Plancher réel et recette source sous enveloppe individuelle ; Soutien du mouvement et mobilité ; aucune dose de force lourde démontrée |
| swim/endurance · A_SWIM_AEROBIC_MULTI_NAGES | moderate_lt1 | 40/55/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| swim/endurance · A_SWIM_CONTINUOUS_2K | moderate_lt1 | 40/40/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| bike/technical · C_IM_AERO_HOLD | moderate_lt1 | 75/75/80 | Plancher réel et recette source sous enveloppe individuelle ; Apprentissage de position aéro ; aucun crédit de longue autonome |
| run/long · A_RUN_Z2_EASY | moderate_lt1 | 60/90/90 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| run/endurance · LYDIARD_RUN_AEROBIC_BASE_MEDIUM | moderate_lt1 | 40/70/70 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |

Les longues autonomes et le travail de position sont comptés séparément. Le soutien est de la mobilité, sans équivalence force lourde. Les interactions sont gérées par le plafond total, les présences disciplinaires, l’espacement choisi, les jours sans dose et les récupérations écrites des fiches ; le coût réel cumulé et l’assimilation restent à observer. Les placements proches entre disciplines différentes ne démontrent pas leur innocuité individuelle.

Contrôles hebdomadaires :39 passages, 0 échecs, 6 inconnues ; erreurs bloquantes exécutées absentes :True.

Inconnues :literal_chronology:IM_balanced_history:strength:0, literal_chronology:IM_balanced_history:swim:0, literal_chronology:IM_balanced_history:swim:1, literal_chronology:IM_balanced_history:run:1, residual_fatigue, metabolic_minutes. Les inconnues de chronologie concernent les sources dont seul l’intervalle numérique est structuré.

Diagnostics natifs hebdomadaires conservés :

- warning · layout_drift : mardi: attendu bike+swim, observé run+swim
- warning · layout_drift : mercredi: attendu run+strength, observé bike
- warning · layout_drift : jeudi: attendu swim, observé strength
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé bike

## Semaine 2 — load, phase base

Position 2/4 ; compétition à 104 jours du début de semaine selon les dates synthétiques existantes. Décision :repeat_tolerated_synthetic_envelope_no_automatic_increase.

| Jour | Séances réellement calculées |
|---|---|
| lundi | Repos · 0 min |
| mardi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 70 min · zones Z1,Z2 ; A_SWIM_CONTINUOUS_2K · 40 min · zones Z1,Z2 |
| mercredi | V3_BIKE_Z2_PROGRESSIF · 120 min · zones Z1,Z2 |
| jeudi | RECOVERY_YOGA_MOBILITY_TRI · 30 min · zones Z1 |
| vendredi | A_RUN_Z2_EASY · 90 min · zones Z1,Z2 |
| samedi | C_IM_AERO_HOLD · 75 min · zones Z2,Z1 |
| dimanche | A_SWIM_AEROBIC_MULTI_NAGES · 55 min · zones Z1,Z2 |

| Rôle/source | Domaine doctrine | Min / retenu / max (min) | Justification de dose |
|---|---|---|---|
| bike/long · V3_BIKE_Z2_PROGRESSIF | moderate_lt1 | 120/120/120 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| strength/skill · RECOVERY_YOGA_MOBILITY_TRI | recovery | 30/30/40 | Plancher réel et recette source sous enveloppe individuelle ; Soutien du mouvement et mobilité ; aucune dose de force lourde démontrée |
| swim/endurance · A_SWIM_AEROBIC_MULTI_NAGES | moderate_lt1 | 40/55/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| swim/endurance · A_SWIM_CONTINUOUS_2K | moderate_lt1 | 40/40/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| bike/technical · C_IM_AERO_HOLD | moderate_lt1 | 75/75/80 | Plancher réel et recette source sous enveloppe individuelle ; Apprentissage de position aéro ; aucun crédit de longue autonome |
| run/long · A_RUN_Z2_EASY | moderate_lt1 | 65/90/90 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| run/endurance · LYDIARD_RUN_AEROBIC_BASE_MEDIUM | moderate_lt1 | 40/70/70 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |

Les longues autonomes et le travail de position sont comptés séparément. Le soutien est de la mobilité, sans équivalence force lourde. Les interactions sont gérées par le plafond total, les présences disciplinaires, l’espacement choisi, les jours sans dose et les récupérations écrites des fiches ; le coût réel cumulé et l’assimilation restent à observer. Les placements proches entre disciplines différentes ne démontrent pas leur innocuité individuelle.

Contrôles hebdomadaires :39 passages, 0 échecs, 6 inconnues ; erreurs bloquantes exécutées absentes :True.

Inconnues :literal_chronology:IM_balanced_history:strength:0, literal_chronology:IM_balanced_history:swim:0, literal_chronology:IM_balanced_history:swim:1, literal_chronology:IM_balanced_history:run:1, residual_fatigue, metabolic_minutes. Les inconnues de chronologie concernent les sources dont seul l’intervalle numérique est structuré.

Diagnostics natifs hebdomadaires conservés :

- warning · layout_drift : mardi: attendu bike+swim, observé run+swim
- warning · layout_drift : mercredi: attendu run+strength, observé bike
- warning · layout_drift : jeudi: attendu swim, observé strength
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé bike

## Semaine 3 — load, phase base

Position 3/4 ; compétition à 97 jours du début de semaine selon les dates synthétiques existantes. Décision :repeat_tolerated_synthetic_envelope_no_automatic_increase.

| Jour | Séances réellement calculées |
|---|---|
| lundi | Repos · 0 min |
| mardi | LYDIARD_RUN_AEROBIC_BASE_MEDIUM · 70 min · zones Z1,Z2 ; A_SWIM_CONTINUOUS_2K · 40 min · zones Z1,Z2 |
| mercredi | V3_BIKE_Z2_PROGRESSIF · 120 min · zones Z1,Z2 |
| jeudi | RECOVERY_YOGA_MOBILITY_TRI · 30 min · zones Z1 |
| vendredi | A_RUN_Z2_EASY · 90 min · zones Z1,Z2 |
| samedi | C_IM_AERO_HOLD · 75 min · zones Z2,Z1 |
| dimanche | A_SWIM_AEROBIC_MULTI_NAGES · 55 min · zones Z1,Z2 |

| Rôle/source | Domaine doctrine | Min / retenu / max (min) | Justification de dose |
|---|---|---|---|
| bike/long · V3_BIKE_Z2_PROGRESSIF | moderate_lt1 | 120/120/120 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| strength/skill · RECOVERY_YOGA_MOBILITY_TRI | recovery | 30/30/40 | Plancher réel et recette source sous enveloppe individuelle ; Soutien du mouvement et mobilité ; aucune dose de force lourde démontrée |
| swim/endurance · A_SWIM_AEROBIC_MULTI_NAGES | moderate_lt1 | 40/55/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| swim/endurance · A_SWIM_CONTINUOUS_2K | moderate_lt1 | 40/40/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| bike/technical · C_IM_AERO_HOLD | moderate_lt1 | 75/75/80 | Plancher réel et recette source sous enveloppe individuelle ; Apprentissage de position aéro ; aucun crédit de longue autonome |
| run/long · A_RUN_Z2_EASY | moderate_lt1 | 75/90/90 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| run/endurance · LYDIARD_RUN_AEROBIC_BASE_MEDIUM | moderate_lt1 | 40/70/70 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |

Les longues autonomes et le travail de position sont comptés séparément. Le soutien est de la mobilité, sans équivalence force lourde. Les interactions sont gérées par le plafond total, les présences disciplinaires, l’espacement choisi, les jours sans dose et les récupérations écrites des fiches ; le coût réel cumulé et l’assimilation restent à observer. Les placements proches entre disciplines différentes ne démontrent pas leur innocuité individuelle.

Contrôles hebdomadaires :39 passages, 0 échecs, 6 inconnues ; erreurs bloquantes exécutées absentes :True.

Inconnues :literal_chronology:IM_balanced_history:strength:0, literal_chronology:IM_balanced_history:swim:0, literal_chronology:IM_balanced_history:swim:1, literal_chronology:IM_balanced_history:run:1, residual_fatigue, metabolic_minutes. Les inconnues de chronologie concernent les sources dont seul l’intervalle numérique est structuré.

Diagnostics natifs hebdomadaires conservés :

- warning · layout_drift : mardi: attendu bike+swim, observé run+swim
- warning · layout_drift : mercredi: attendu run+strength, observé bike
- warning · layout_drift : jeudi: attendu swim, observé strength
- warning · layout_drift : vendredi: attendu qualité (isKeySession), observé séance non-clé
- warning · layout_drift : samedi: attendu brick, observé bike

## Semaine 4 — recovery, phase base

Position 4/4 ; compétition à 90 jours du début de semaine selon les dates synthétiques existantes. Décision :native_recovery_minima_without_extra_fill.

| Jour | Séances réellement calculées |
|---|---|
| lundi | Repos · 0 min |
| mardi | A_BIKE_END_90_PRO · 85 min · zones Z1,Z2 |
| mercredi | RECOVERY_YOGA_MOBILITY_TRI · 30 min · zones Z1 |
| jeudi | A_RUN_EASY_45_PRO · 55 min · zones Z1,Z2 |
| vendredi | A_SWIM_AEROBIC_MULTI_NAGES · 40 min · zones Z1,Z2 |
| samedi | A_SWIM_CONTINUOUS_2K · 40 min · zones Z1,Z2 |
| dimanche | Repos · 0 min |

| Rôle/source | Domaine doctrine | Min / retenu / max (min) | Justification de dose |
|---|---|---|---|
| bike/long · A_BIKE_END_90_PRO | moderate_lt1 | 85/85/105 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| strength/skill · RECOVERY_YOGA_MOBILITY_TRI | recovery | 30/30/40 | Plancher réel et recette source sous enveloppe individuelle ; Soutien du mouvement et mobilité ; aucune dose de force lourde démontrée |
| swim/endurance · A_SWIM_AEROBIC_MULTI_NAGES | moderate_lt1 | 40/40/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| swim/endurance · A_SWIM_CONTINUOUS_2K | moderate_lt1 | 40/40/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |
| run/long · A_RUN_EASY_45_PRO | moderate_lt1 | 55/55/55 | Plancher réel et recette source sous enveloppe individuelle ; Socle d’endurance sous LT1 dans la discipline retenue ; hypothèse liée au limiteur, sans prédiction de changement métabolique |

Les longues autonomes et le travail de position sont comptés séparément. Le soutien est de la mobilité, sans équivalence force lourde. Les interactions sont gérées par le plafond total, les présences disciplinaires, l’espacement choisi, les jours sans dose et les récupérations écrites des fiches ; le coût réel cumulé et l’assimilation restent à observer. Les placements proches entre disciplines différentes ne démontrent pas leur innocuité individuelle.

Contrôles hebdomadaires :31 passages, 0 échecs, 6 inconnues ; erreurs bloquantes exécutées absentes :True.

Inconnues :literal_chronology:IM_balanced_history:bike:0, literal_chronology:IM_balanced_history:strength:0, literal_chronology:IM_balanced_history:swim:0, literal_chronology:IM_balanced_history:swim:1, residual_fatigue, metabolic_minutes. Les inconnues de chronologie concernent les sources dont seul l’intervalle numérique est structuré.

Diagnostics natifs hebdomadaires conservés :

- warning · layout_drift : mardi: attendu swim, observé bike
- warning · layout_drift : jeudi: attendu swim, observé run
- warning · layout_drift : samedi: attendu brick, observé swim
- warning · layout_drift : dimanche: attendu run, observé rest

Obligations de développement non reconduites en récupération selon le quota natif :IM_balanced_history:bike:1, IM_balanced_history:run:1. Aucune discipline supprimée.

## Continuité, récupération et limites

Audit technique de bloc :True. Contrôles globaux exécutés :True. Pas de conflit d’espacement vélo/course aux frontières de semaines pour ce calendrier. Les plafonds et planchers existants restent actifs. La natation peut rester à son minimum en récupération ; une baisse dans chaque discipline n’est pas une loi physiologique.

Le profil aérobie passe sa longue course70→75 min en S3 uniquement pour respecter le plancher individualisé natif75, dans son enveloppe V10. Le profil équilibré maintient ses doses de développement. Ni maintien ni cinq minutes supplémentaires ne prouvent une adaptation obtenue. Le rythme trois semaines+une est une comparaison de cas, pas une prescription universelle.

| Code historique brut | Sévérité | Nombre |
|---|---|---|
| layout_drift | warning | 19 |
| sport_ratio | error | 2 |
| race_day | error | 1 |
| title_format | error | 1 |
| anti_repetition | warning | 12 |
| calendar_coverage | error | 1 |
| triathlon_discipline_continuity | error | 1 |
| triathlon_training_frequency | error | 1 |

Les erreurs sport_ratio et les avertissements de répétition/placement restent pertinents méthodologiquement ; ils ne sont pas effacés. Les diagnostics de course et couverture portent sur le préfixe de préparation16 semaines. Voir [portées et limites](WEEK_SCOPE_VALIDATION.md). Aucun résultat candidat n’est présenté comme une conformité aux anciens validateurs. Toutes les sorties sont dans evidence/final/mesocycles.json.gz.

Questions de revue : adéquation du couple longue+position en base ; précautions symptomatiques/posturales ; pertinence de la natation maintenue et des fréquences réduites en S4 ; future progression spécifique Ironman, nutrition et bricks ; acceptabilité du maintien/répétition pour les objectifs de ce profil. Les références et leurs limites restent [celles de V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md).
