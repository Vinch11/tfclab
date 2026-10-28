# Résultats V7

Les 600 configurations historiques sont inchangées : 167 plans assemblés, 11 sans erreur bloquante des contrôles historiques exécutés, zéro nouvelle alerte sur le rejeu. Les 433 autres configurations ne sont pas déclarées toutes impossibles. Les classifications détaillées restent dans `evidence/reference/summary.json`.

| Cohorte archivée | Plans techniques | Entrées distinctes | Sans blocage historique | Erreurs historiques | Avertissements historiques |
|---|---:|---:|---:|---:|---:|
| V5_same76 | 76/76 | 29 | 0 | 698 | 5383 |
| V6_same76 | 76/76 | 29 | 0 | 676 | 5381 |
| V6_new_ultra_only | 2/2 | 2 | 0 | 8 | 33 |
| V6_strict_IM_models | 16/16 | 8 | 0 | 121 | 1302 |

V5 et V6 désignent deux versions de la même cohorte de 76 variantes, pas 152 configurations indépendantes. Les 2 ultras et 16 modèles Ironman stricts restent séparés. V7 ne réduit pas les erreurs historiques par réécriture des plans ou validateurs.

| Cohorte | Contrat candidat | Cas évalués | Sans blocage exécuté, conditionnels | Pleinement attestés |
|---|---|---:|---:|---:|
| V5_same76 | historical_AB_every_base | 15 | 0 | 0 |
| V5_same76 | foundation_roles_then_quality | 15 | 4 | 0 |
| V5_same76 | quality_only_when_source_supported | 15 | 4 | 0 |
| V5_same76 | long_and_training_all_weeks | 61 | 0 | 0 |
| V5_same76 | week_specific_training_and_competition | 61 | 0 | 0 |
| V6_same76 | historical_AB_every_base | 15 | 0 | 0 |
| V6_same76 | foundation_roles_then_quality | 15 | 4 | 0 |
| V6_same76 | quality_only_when_source_supported | 15 | 4 | 0 |
| V6_same76 | long_and_training_all_weeks | 61 | 0 | 0 |
| V6_same76 | week_specific_training_and_competition | 61 | 0 | 0 |
| V6_new_ultra_only | historical_AB_every_base | 2 | 0 | 0 |
| V6_new_ultra_only | foundation_roles_then_quality | 2 | 2 | 0 |
| V6_new_ultra_only | quality_only_when_source_supported | 2 | 0 | 0 |
| V6_strict_IM_models | long_and_training_all_weeks | 16 | 0 | 0 |
| V6_strict_IM_models | week_specific_training_and_competition | 16 | 0 | 0 |

Le modèle trail fondation permet 6/17 variantes sans blocage candidat exécuté (4/15 historiques synthétiques + 2 ultras), contre 4/17 pour le modèle exigeant une intensité uniquement si le catalogue la soutient. Ces variantes ne sont pas toutes des configurations distinctes, et ne passent pas les anciens validateurs. Zéro plan revu par expert.

Les ratios expérimentaux utilisent des minutes par discipline et bloc réel, avec la tolérance source de ±3 points. Les minutes de brick inconnues restent inconnues. Aucun candidat ne passe tous les blocs de ratios source : la reconception des doses/catalogues Ironman reste nécessaire. Les fréquences physiques, quotas effectifs et expositions disciplinaires sont indépendants.

Les deux contrats Ironman conservent les planchers de développement. Dans la comparaison ciblée de 77 variantes, le modèle imposant les longues séances toutes les semaines produit 129 manquements en semaines allégées, contre zéro pour la règle différenciée. Ce changement de lecture ne suffit à rendre aucun Ironman conforme aux contrôles candidats exécutés. Il ne démontre pas une récupération physiologique adéquate.

Le contrôle global V5 est réexécuté, ainsi que le contrat d’affûtage V5. La récupération observée, la tolérance D+/D− et excentrique restent inconnues. Aucun seuil universel nouveau ni dose individuelle inventée.

## Dossiers examinables

| Dossier | Semaines | Meilleur statut candidat | Blocages | Inconnues |
|---|---:|---|---:|---:|
| ironman | 16 | fails | 12 | 9 |
| trail-court | 12 | conditional_no_executed_blocker | 0 | 16 |
| trail-montagne | 16 | conditional_no_executed_blocker | 0 | 20 |
| ultra | 20 | conditional_no_executed_blocker | 0 | 24 |

## Disponibilité Coach Preview

Aucune famille n’est intégrée à la Coach Preview applicative par ce travail. Quatre dossiers offline sont disponibles pour revue : Ironman diagnostique bloqué ; trail court, montagne et ultra conditionnels sous le contrat fondation. Ce manifeste ne permet aucune prescription automatique ni écriture de données réelles.

## Limites et décisions réellement nécessaires

Revue sportive indépendante des contrats trail sans plafond imposant du vélo, des modèles A/B de base et de leur applicabilité en affûtage, ainsi que des obligations longues Ironman différenciées par semaine. Fournir des preuves individuelles de tolérance verticale/excentrique, de réponse à la fatigue et de disponibilité avant toute utilisation réelle. Les corrections techniques ordinaires restent autorisées ; aucune promotion des contrats candidats dans la doctrine ou le moteur actuel. NO-GO maintenu.

Les premiers agrégats V7 `comparison` et `comparison-final` sont conservés mais remplacés par `comparison-complete` : un filtre mélangeait les dimensions de modèles trail et Ironman. Les données par plan étaient conservées ; les dénominateurs finaux sont vérifiés par sport.

## Validation exécutée

Le typage et les 58 tests Node du contrôleur passent. La suite expérimentale ordinaire passe 70 tests (34 tests de matrices restent opt-in dans cette invocation ; les matrices V7 ont leurs exécutions explicites et preuves séparées). Le résultat historique complet et les durées sont consignés dans `validation-summary.json`, sans assimiler tests ignorés à des contrôles exécutés.
