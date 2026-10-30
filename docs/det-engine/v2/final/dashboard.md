# DET-ENGINE — diagnostic et tableau de bord

Version : det-v2-plan-repair-08-9680f75bb5ea ; diagnostic det-diagnostic-v2.2.

Sur 600 configurations : **167 plans assemblés**, **11 sans erreur bloquante enregistrée**, **156 plans assemblés non conformes**.
433 refus ne sont pas assimilés à des erreurs moteur : 200 routes/adaptateurs non couverts, 29 recherches non concluantes. **0 impossibilité globale prouvée**.

Les résultats sans erreur portent exclusivement sur les contrôles exécutés. Aucun résultat ne certifie la pertinence sportive générale. Les avertissements restent comptés ; les seuils et sévérités ne sont pas modifiés.

## Indicateurs et portée

| Indicateur | Mesure vérifiée |
|---|---|
| Structure sans code bloquant enregistré | 159 / 167 construits ; distinct du schéma audité séparément |
| Règles sportives exécutées sans erreur | 11 / 167 construits ; pas de certification générale |
| Réparations | 13808 tentatives ; 245 acceptées ; 13563 rejetées |
| Occurrences critiques réduites par transitions acceptées | 252 ; pas un décompte de défauts physiologiques indépendants |
| Pertinence sportive générale | Non attestée ; revue experte requise |
| Reproductibilité | verified_identical_replay ; cas identiques : 600 |

## Causes observées et hypothèses

| Cause observée | Cas | Portée de la preuve | Exemple reproductible |
|---|---:|---|---|
| bounded_search_inconclusive | 29 | unknown | 703:untrained:finisher:known_synthetic |
| constructed_with_executed_blocker | 156 | executed_controls_only | 703:untrained:age_group:known_synthetic |
| constructed_without_executed_blocker | 11 | executed_controls_only | Marathon:light:finisher:known_synthetic |
| dedicated_quota_contract_missing | 160 | unsupported_route | Trail:untrained:finisher:unknown |
| empty_filtered_slot_domain | 92 | fixed_pool_and_layout_only | 703:untrained:competitor:known_synthetic |
| fixed_contract_prevalidation_conflict | 58 | fixed_contract_only | 703:highly_trained:competitor:unknown |
| fixed_slot_minimum_dose_exceeds_ceiling | 38 | fixed_pool_and_layout_only | 703:untrained:finisher:unknown |
| no_assignment_in_current_search_space | 16 | fixed_pool_and_layout_only | 703:light:world_class:known_synthetic |
| static_template_adapter_missing | 40 | unsupported_adapter | StartToRun:untrained:finisher:unknown |

Les codes des validateurs décrivent des symptômes. Les hypothèses de cause racine et leurs dépendances sont explicitées séparément dans diagnostic.json ; elles exigent des expériences ciblées.

## Résultats par objectif et format

| Objectif / format | Cas | Construits | Sans erreur exécutée | Refus |
|---|---:|---:|---:|---:|
| 10K:continuous | 40 | 23 | 3 | 17 |
| 5K:continuous | 40 | 23 | 1 | 17 |
| 703:continuous | 40 | 2 | 0 | 38 |
| 703:lcw_3day | 40 | 20 | 0 | 20 |
| IM:continuous | 40 | 0 | 0 | 40 |
| IM:lcw_3day | 40 | 20 | 0 | 20 |
| Marathon:continuous | 40 | 21 | 1 | 19 |
| Olympic:continuous | 40 | 12 | 0 | 28 |
| Semi:continuous | 40 | 26 | 6 | 14 |
| Sprint:continuous | 40 | 20 | 0 | 20 |
| StartToRun:continuous | 40 | 0 | 0 | 40 |
| Trail:continuous | 40 | 0 | 0 | 40 |
| TrailMountain:continuous | 40 | 0 | 0 | 40 |
| TrailShort:continuous | 40 | 0 | 0 | 40 |
| TrailUltra:continuous | 40 | 0 | 0 | 40 |

## Résultats par objectif, ambition demandée et format

| Objectif / ambition / format | Cas | Construits | Sans erreur exécutée |
|---|---:|---:|---:|
| 10K:age_group:continuous | 8 | 7 | 0 |
| 10K:competitor:continuous | 8 | 3 | 1 |
| 10K:elite:continuous | 8 | 3 | 0 |
| 10K:finisher:continuous | 8 | 7 | 2 |
| 10K:world_class:continuous | 8 | 3 | 0 |
| 5K:age_group:continuous | 8 | 7 | 0 |
| 5K:competitor:continuous | 8 | 3 | 0 |
| 5K:elite:continuous | 8 | 3 | 0 |
| 5K:finisher:continuous | 8 | 7 | 1 |
| 5K:world_class:continuous | 8 | 3 | 0 |
| 703:age_group:continuous | 8 | 1 | 0 |
| 703:age_group:lcw_3day | 8 | 6 | 0 |
| 703:competitor:continuous | 8 | 0 | 0 |
| 703:competitor:lcw_3day | 8 | 4 | 0 |
| 703:elite:continuous | 8 | 0 | 0 |
| 703:elite:lcw_3day | 8 | 1 | 0 |
| 703:finisher:continuous | 8 | 0 | 0 |
| 703:finisher:lcw_3day | 8 | 5 | 0 |
| 703:world_class:continuous | 8 | 1 | 0 |
| 703:world_class:lcw_3day | 8 | 4 | 0 |
| IM:age_group:continuous | 8 | 0 | 0 |
| IM:age_group:lcw_3day | 8 | 5 | 0 |
| IM:competitor:continuous | 8 | 0 | 0 |
| IM:competitor:lcw_3day | 8 | 4 | 0 |
| IM:elite:continuous | 8 | 0 | 0 |
| IM:elite:lcw_3day | 8 | 4 | 0 |
| IM:finisher:continuous | 8 | 0 | 0 |
| IM:finisher:lcw_3day | 8 | 5 | 0 |
| IM:world_class:continuous | 8 | 0 | 0 |
| IM:world_class:lcw_3day | 8 | 2 | 0 |
| Marathon:age_group:continuous | 8 | 7 | 0 |
| Marathon:competitor:continuous | 8 | 4 | 0 |
| Marathon:elite:continuous | 8 | 2 | 0 |
| Marathon:finisher:continuous | 8 | 6 | 1 |
| Marathon:world_class:continuous | 8 | 2 | 0 |
| Olympic:age_group:continuous | 8 | 1 | 0 |
| Olympic:competitor:continuous | 8 | 2 | 0 |
| Olympic:elite:continuous | 8 | 2 | 0 |
| Olympic:finisher:continuous | 8 | 4 | 0 |
| Olympic:world_class:continuous | 8 | 3 | 0 |
| Semi:age_group:continuous | 8 | 8 | 2 |
| Semi:competitor:continuous | 8 | 4 | 0 |
| Semi:elite:continuous | 8 | 4 | 1 |
| Semi:finisher:continuous | 8 | 7 | 3 |
| Semi:world_class:continuous | 8 | 3 | 0 |
| Sprint:age_group:continuous | 8 | 5 | 0 |
| Sprint:competitor:continuous | 8 | 5 | 0 |
| Sprint:elite:continuous | 8 | 3 | 0 |
| Sprint:finisher:continuous | 8 | 5 | 0 |
| Sprint:world_class:continuous | 8 | 2 | 0 |
| StartToRun:age_group:continuous | 8 | 0 | 0 |
| StartToRun:competitor:continuous | 8 | 0 | 0 |
| StartToRun:elite:continuous | 8 | 0 | 0 |
| StartToRun:finisher:continuous | 8 | 0 | 0 |
| StartToRun:world_class:continuous | 8 | 0 | 0 |
| Trail:age_group:continuous | 8 | 0 | 0 |
| Trail:competitor:continuous | 8 | 0 | 0 |
| Trail:elite:continuous | 8 | 0 | 0 |
| Trail:finisher:continuous | 8 | 0 | 0 |
| Trail:world_class:continuous | 8 | 0 | 0 |
| TrailMountain:age_group:continuous | 8 | 0 | 0 |
| TrailMountain:competitor:continuous | 8 | 0 | 0 |
| TrailMountain:elite:continuous | 8 | 0 | 0 |
| TrailMountain:finisher:continuous | 8 | 0 | 0 |
| TrailMountain:world_class:continuous | 8 | 0 | 0 |
| TrailShort:age_group:continuous | 8 | 0 | 0 |
| TrailShort:competitor:continuous | 8 | 0 | 0 |
| TrailShort:elite:continuous | 8 | 0 | 0 |
| TrailShort:finisher:continuous | 8 | 0 | 0 |
| TrailShort:world_class:continuous | 8 | 0 | 0 |
| TrailUltra:age_group:continuous | 8 | 0 | 0 |
| TrailUltra:competitor:continuous | 8 | 0 | 0 |
| TrailUltra:elite:continuous | 8 | 0 | 0 |
| TrailUltra:finisher:continuous | 8 | 0 | 0 |
| TrailUltra:world_class:continuous | 8 | 0 | 0 |

## Niveau déclaré

| Niveau | Cas | Construits | Sans erreur exécutée |
|---|---:|---:|---:|
| highly_trained | 150 | 30 | 2 |
| light | 150 | 56 | 2 |
| trained | 150 | 38 | 3 |
| untrained | 150 | 43 | 4 |

## Ambition effective et contexte physiologique

Ambition effective enregistrée pour 600 cas ; contexte physiologique pour 600 cas. L’export du contexte ne prouve pas une réponse physiologique mesurée.

| Ambition effective | Cas | Construits | Sans erreur exécutée |
|---|---:|---:|---:|
| age_group | 180 | 68 | 1 |
| competitor | 60 | 8 | 0 |
| elite | 90 | 7 | 0 |
| finisher | 240 | 82 | 10 |
| world_class | 30 | 2 | 0 |

| Profil physiologique synthétique | Cas | Construits | Sans erreur exécutée |
|---|---:|---:|---:|
| aerobic_dominant | 120 | 38 | 2 |
| atypical_extreme | 120 | 37 | 1 |
| balanced_typical | 120 | 29 | 1 |
| glycolytic_dominant | 120 | 28 | 3 |
| master_40plus | 120 | 35 | 4 |

## Fréquences des contrôles enregistrés

| Contrôle / espace | Exécuté | Non applicable | Non implémenté | Non exécuté | Inconnu / revue | Résultats |
|---|---:|---:|---:|---:|---:|---|
| aggregate_validator:existing_prevalidation | 560 | 0 | 0 | 40 | 0 | non enregistré |
| aggregate_validator:final_B13_B14_B15 | 167 | 0 | 0 | 433 | 0 | non enregistré |
| aggregate_validator:plan_validator_complete_context | 167 | 0 | 0 | 433 | 0 | non enregistré |
| aggregate_validator:sports_continuity_audit | 167 | 0 | 0 | 433 | 0 | non enregistré |
| aggregate_validator:weekly_quotas | 167 | 0 | 0 | 433 | 0 | non enregistré |
| conditional_context:ambitionAudit | 600 | 0 | 0 | 0 | 0 | non enregistré |
| conditional_context:coachOrder | 497 | 103 | 0 | 0 | 0 | non enregistré |
| conditional_context:generalSportingRelevance | 0 | 0 | 0 | 0 | 600 | non enregistré |
| conditional_context:limiterKeys | 484 | 116 | 0 | 0 | 0 | non enregistré |
| conditional_context:loadHistory | 0 | 600 | 0 | 0 | 0 | non enregistré |
| conditional_context:physiologicalResponse | 0 | 0 | 600 | 0 | 0 | non enregistré |
| sports_audit:calendar_coverage | 167 | 0 | 433 | 0 | 0 | unknown: 433, pass: 167 |
| sports_audit:trail_elevation_progression | 0 | 440 | 160 | 0 | 0 | not_applicable: 440, unknown: 160 |
| sports_audit:trail_muscular_specificity | 160 | 0 | 0 | 0 | 0 | unknown: 160 |
| sports_audit:trail_structured_elevation_provenance | 160 | 0 | 0 | 0 | 0 | unknown: 160 |
| sports_audit:triathlon_discipline_continuity | 74 | 360 | 166 | 0 | 0 | unknown: 166, pass: 74, not_applicable: 360 |
| sports_audit:triathlon_progression_by_discipline | 240 | 0 | 0 | 0 | 0 | unknown: 240 |
| sports_audit:triathlon_training_frequency | 74 | 0 | 166 | 0 | 0 | unknown: 166, pass: 74 |

Les contrôles agrégés mesurent l’invocation enregistrée. Les statuts conditional_context décrivent le contexte fourni et ne prouvent pas une exécution de règle interne sur un plan refusé. Les résultats pass/fail/unknown des audits restent séparés des statuts d’exécution.
Audit de contrats physiques/calendar/quota : 167 plans construits audités ; {"pass":167}. Ces observations ne valident ni la progression physiologique ni la pertinence sportive générale.
Validation technique de schéma : audit séparé exécuté sur 167 candidats, 167 réussites. Les versions et hashes de chaque plan correspondent au bundle final. Voir technical-audit-final.json.

## Couverture réellement acquise

Les invocations et leur applicabilité doivent être fournies par un manifeste de contrôles versionné. Le diagnostic n’infère jamais qu’une règle a été exécutée de l’absence d’un message.
Les contrôles non exécutés, non applicables et non encore implémentés restent distincts. L’absence de code d’erreur ne constitue pas à elle seule une preuve de validation.
La preuve historique de reproductibilité est un rejeu identique des 600 sorties. Ce diagnostic conserve cette preuve séparément ; un candidat nouveau doit être rejoué à son tour.

## Limites de la baseline

Les réparations sont comptées uniquement à partir des tentatives enregistrées. Une transition acceptée ne certifie pas la pertinence sportive générale du plan. Les audits de présence, de calendrier et de quotas ne remplacent pas une réponse physiologique mesurée. Aucun refus ne prouve à lui seul une impossibilité sportive globale.

Diagnostic exclusivement sur des profils synthétiques ; aucune donnée personnelle ni écriture vers un service externe.

## Audit technique indépendant

167 / 167 schémas/calendriers vérifiés ; 433 refus sans candidat : non applicable. Ce résultat ne remplace pas le respect des contraintes sportives.
