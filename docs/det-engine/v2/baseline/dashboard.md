# DET-ENGINE — diagnostic et tableau de bord

Version : f933ced243d15bd759a0704b88aa140ac9b4f4d9 ; diagnostic det-diagnostic-v2.1.

Sur 600 configurations : **167 plans assemblés**, **7 sans erreur bloquante enregistrée**, **160 plans assemblés non conformes**.
433 refus ne sont pas assimilés à des erreurs moteur : 200 routes/adaptateurs non couverts, 29 recherches non concluantes. **0 impossibilité globale prouvée**.

Les résultats sans erreur portent exclusivement sur les contrôles exécutés. Aucun résultat ne certifie la pertinence sportive générale. Les avertissements restent comptés ; les seuils et sévérités ne sont pas modifiés.

## Causes observées et hypothèses

| Cause observée | Cas | Portée de la preuve | Exemple reproductible |
|---|---:|---|---|
| bounded_search_inconclusive | 29 | unknown | 703:untrained:finisher:known_synthetic |
| constructed_with_executed_blocker | 160 | executed_controls_only | 703:untrained:age_group:known_synthetic |
| constructed_without_executed_blocker | 7 | executed_controls_only | Semi:untrained:finisher:known_synthetic |
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
| 10K:continuous | 40 | 23 | 1 | 17 |
| 5K:continuous | 40 | 23 | 1 | 17 |
| 703:continuous | 40 | 2 | 0 | 38 |
| 703:lcw_3day | 40 | 20 | 0 | 20 |
| IM:continuous | 40 | 0 | 0 | 40 |
| IM:lcw_3day | 40 | 20 | 0 | 20 |
| Marathon:continuous | 40 | 21 | 0 | 19 |
| Olympic:continuous | 40 | 12 | 0 | 28 |
| Semi:continuous | 40 | 26 | 5 | 14 |
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
| 10K:competitor:continuous | 8 | 3 | 0 |
| 10K:elite:continuous | 8 | 3 | 0 |
| 10K:finisher:continuous | 8 | 7 | 1 |
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
| Marathon:finisher:continuous | 8 | 6 | 0 |
| Marathon:world_class:continuous | 8 | 2 | 0 |
| Olympic:age_group:continuous | 8 | 1 | 0 |
| Olympic:competitor:continuous | 8 | 2 | 0 |
| Olympic:elite:continuous | 8 | 2 | 0 |
| Olympic:finisher:continuous | 8 | 4 | 0 |
| Olympic:world_class:continuous | 8 | 3 | 0 |
| Semi:age_group:continuous | 8 | 8 | 1 |
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
| light | 150 | 56 | 1 |
| trained | 150 | 38 | 2 |
| untrained | 150 | 43 | 2 |

## Couverture réellement acquise

Baseline V1 auditée : prévalidation sur 560 cas non statiques ; validation complète, quotas et B13/B14/B15 après construction des 167 candidats. Les 433 refus n’ont pas passé la validation sportive finale. Les règles internes restent conditionnelles.
V1 ne transmet pas les clés structurées de limiteurs, l’ordre manuel du coach, l’audit d’ambition ou l’historique détaillé de charge. L’export ne distingue pas chaque règle passée, non applicable ou non exécutée. Les durées de compétition restent non estimées ; aucune couverture de ces points ne doit être déduite des métriques.
La preuve historique de reproductibilité est un rejeu identique des 600 sorties. Ce diagnostic conserve cette preuve séparément ; un candidat nouveau doit être rejoué à son tour.

## Limites de la baseline

Les contrôles V1 de structure sont un sous-ensemble explicite des codes de validation ; le tableau de bord ne remplace pas une validation de schéma complète. Aucune tentative de réparation n’est enregistrée dans les anciennes lignes : taux de réparation non mesuré. Aucun refus ne prouve à lui seul une impossibilité sportive globale.

Diagnostic exclusivement sur des profils synthétiques ; aucune donnée personnelle ni écriture vers un service externe.
