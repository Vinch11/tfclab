# Intégrité du catalogue — V13

Périmètre : offres natives des seize semaines pour les deux profils synthétiques, plus cinq témoins prioritaires. Ce n’est pas une revue exhaustive de toute la bibliothèque. Aucune fiche de production ni aucun validateur historique n’est modifié.

340 sources uniques examinées. La couverture temporelle est distinguée de la pertinence sportive et de la faisabilité individuelle.

| Diagnostic de source | Nombre |
|---|---|
| temporal_coverage_unknown | 302 |
| complete_literal_temporal_bounds_compatible | 3 |
| advertised_range_partly_outside_demonstrated_recipe | 19 |
| mandatory_components_conflict_with_advertised_total | 1 |
| partial_timing_bounds_only | 12 |
| unattributed_advertised_session_time | 3 |

Le premier essai réutilisait trop largement literalDose V10 : une sous-recette Main pouvait être prise pour toute la séance, et des blocs composés étaient omis. Ses six conflits initiaux ne sont pas six fiches prouvées impossibles. Les sorties sont conservées dans evidence/attempt-1 ; la couche V13 exige une grammaire couverte et sépare borne minimale, blocs quantifiés, totalité explicitement décrite et temps non attribué. La production reste intacte.

| Source | Annonce, min | Blocs quantifiés | Borne minimale certaine | Fourchette de recette complète connue | Diagnostic |
|---|---|---|---|---|---|
| C_BRICK_TRANSITION_DRILL | [30, 45] | [55, 55] | 55 | None | mandatory_components_conflict_with_advertised_total |
| C_IM_AERO_HOLD | [60, 120] | [75, 80] | 75 | None | advertised_range_partly_outside_demonstrated_recipe |
| C_BIKE_AERO_POSITION_DRILLS | [60, 120] | [85, 90] | 85 | None | advertised_range_partly_outside_demonstrated_recipe |
| V3_BIKE_Z2_PROGRESSIF | [90, 150] | [120, 120] | 120 | [120, 120] | advertised_range_partly_outside_demonstrated_recipe |
| V3_BIKE_Z2_ENDURANCE_LONG | [150, 300] | [180, 300] | 180 | [180, 300] | advertised_range_partly_outside_demonstrated_recipe |
| D_TAPER_BIKE_OPENER | [40, 60] | [53, 56] | 53 | None | advertised_range_partly_outside_demonstrated_recipe |
| B_BIKE_SST_3x12_PRO | [60, 90] | [46, 51] | 46 | None | unattributed_advertised_session_time |
| B_BIKE_VO2_6x3_PRO | [50, 75] | [33, 36] | 33 | None | unattributed_advertised_session_time |
| B_RUN_TEMPO_2x20_PRO | [65, 95] | [45, 50] | 45 | None | unattributed_advertised_session_time |
| B_BRICK_SEUIL_LONG_BUILD_IM | [180, 240] | None | None | None | temporal_coverage_unknown |

- Brick de transition :15 +5×(3+3)+10 =55 min actifs au minimum, avant transitions inconnues ; le maximum annoncé45 est dépassé.
- Position :4×15 avec3–4 repos5 donne75–80 min de blocs ;6×10 avec5–6 repos5 donne85–90. Le minimum60 annoncé ne permet pas toute la recette. Main seul ne prouve toutefois pas que120 min soit impossible : le reste du temps n’est pas documenté, et aucun échauffement n’est inventé.
- Vélo progressif : trois blocs30 min plus15+15 min donnent120 min pour la recette explicite, sans compression ni extension d’une variante en prose.
- Longue V3 :20 min +150–270 min +10 min donne180–300 ;150 min n’exécute pas tous les éléments.
- Opener vélo composé :30 +4×1 +(3–4)×3 +10 =53–56 min de blocs, pas13–16. Les valeurs annoncées sous53 ne couvrent pas les éléments obligatoires. Le rappel d’intensité de la source n’est pas interdit universellement en taper.
- Les seules répétitions SST/VO2/tempo ne détaillent pas tout le temps annoncé : le supplément reste non attribué. Il n’est pas automatiquement classé comme contradiction, ni fabriqué en échauffement. Le brick long à plusieurs disciplines dépasse la grammaire du parseur partiel ; sa projection historique est conservée comme non probante.

## Phases, intensités et contexte

Les phases déclarées et phases effectives issues de la normalisation existante sont enregistrées pour chaque source, avec zones, prérequis et contexte particulier. L’overlay du brick garde les mêmes phases et intensités ; sa phase effectivepeak ne devient pasbuild pour le rendre sélectionnable. L’horizon natif de ces cas ne contient pas de phasepeak explicite : cela n’invalide pas toutes les préparations, mais cette fiche ne peut être imposée à un autre contexte sans revue.

Les fenêtres littérales J−5 à J−3 sont vérifiées sur les dates existantes en plus du placement V11. Une date manquante ne confirme pas le placement. Les exclusions explicites de taper sont conservées sans transformer toute récupération en interdiction générale des rappels d’intensité. Le diagnostic temporel ne certifie ni charge interne ni pertinence physiologique.

La majeure partie des sources reste hors grammaire temporelle complète ; cela constitue une limite de couverture, pas une liste de séances invalides. Aucun résultat d’audit n’est promu automatiquement dans la doctrine.
