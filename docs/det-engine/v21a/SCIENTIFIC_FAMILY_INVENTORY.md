# Inventaire des familles scientifiques

DRAFT — NO-GO. Préparation documentaire uniquement ; aucune validation scientifique automatique, dose ou règle modifiée.

920 IDs uniques, 2 425 variantes historiques conservées avec leur texte et leur classification technique V18 : 1 073 ambiguës, 1 346 descriptives, 6 à paramètre explicite. Aucun de ces statuts ne juge l’efficacité scientifique. Les 96 propositions complètes V19 / 51 IDs et les 418 propositions V19 restent des overlays séparés, sans remplacement des 920 sources.

[Mapping complet](WORKOUT_FAMILY_MAPPING.jsonl) : une ligne par ID, source brute et effective intégrales, structure, variantes, restrictions, inconnues, provenance, métadonnées et qualifications héritées. [Définitions et listes d’IDs](evidence/accepted/family-definitions-and-impact.json).

## Ce que signifie un rattachement

Chaque correspondance est un routage candidat vers une question de recherche. L’extrait et son pointeur sont conservés. `declared_target` signifie revendication historique explicite (objectif, tag, métadonnée ou discipline), pas adaptation obtenue. `component_or_rationale_only` signifie composant ou justification secondaire ; `goal_scope_only` indique seulement une compatibilité d’objectif. Les familles se recouvrent et ne doivent pas être additionnées. L’efficacité, le niveau de preuve et les références ne sont jamais déduits de ces correspondances.

Les mécanismes sont séparés des contextes (trail, natation, bricks, Ironman, affûtage) et des soutiens (nutrition, chaleur/hypoxie). L’endurance musculaire n’est pas automatiquement aérobie ; « sans fatigue » ne devient pas une exposition de durabilité. Une récupération dans un échauffement reste un composant de cet échauffement. Les domaines d’intensité restent ceux de `src/lib/zones/tfclDoctrine.ts`, sans nouveau calcul.

L’[index des 418 candidats éditoriaux](evidence/handoff/EDITORIAL_CANDIDATE_INDEX.jsonl) conserve leur revue V20 sans les appliquer aux sources. La [ventilation par objectif, ambition et niveau qualitatif](evidence/handoff/FAMILY_USAGE_BY_OBJECTIVE.csv) contient 1 309 strates d’usage historique ; elle ne mesure pas une efficacité sportive.

| Famille | Axe | IDs avec au moins une mention | Objectif déclaré | Occurrences ciblées V2 | Occurrences ciblées V14 natif |
|---|---|---:|---:|---:|---:|
| Endurance aérobie | mechanism | 176 | 152 | 1470 | 74 |
| Stimuli VO₂max | mechanism | 73 | 62 | 118 | 0 |
| Seuils et intensité soutenable | mechanism | 199 | 142 | 860 | 14 |
| Durabilité et fatigue prolongée | mechanism | 169 | 119 | 1041 | 42 |
| Force et préparation musculaire | mechanism | 249 | 208 | 2556 | 30 |
| Économie et coordination locomotrice | mechanism | 204 | 68 | 1448 | 38 |
| Technique et apprentissage moteur | mechanism | 278 | 112 | 1715 | 62 |
| Récupération et gestion de la fatigue | mechanism | 725 | 87 | 3730 | 108 |
| Trail, vertical et excentrique | context | 380 | 200 | 551 | 0 |
| Natation et milieu aquatique | context | 173 | 146 | 2356 | 70 |
| Bricks et transitions multidisciplinaires | context | 116 | 75 | 391 | 0 |
| Spécificité Ironman et posture | context | 522 | 62 | 551 | 30 |
| Affûtage et activation compétitive | context | 101 | 49 | 816 | 0 |
| Nutrition, disponibilité énergétique et tolérance digestive | support | 155 | 55 | 60 | 0 |
| Chaleur, hypoxie et environnement | support | 17 | 11 | 0 | 0 |

Deux séances restent sans rattachement positif : `A_10K_PROGRESSIVE_60` et `A_SEMI_PROGRESSIVE_FINISH`. Leur negative split décrit une construction, sans préciser à lui seul le mécanisme recherché. Elles sont conservées intégralement et orientées vers clarification d’intention, sans famille inventée.

## Couverture et limites

Sports canoniques : bike 168, run 416, swim 119, brick 55, strength 127, trail 3, mixed 32. Le contexte trail traverse aussi des fiches classées run/strength ; les trois IDs de discipline trail ne résument donc pas la couverture trail. Deux métadonnées physiologiques sont dans les sources brutes, 25 dans la représentation effective enrichie existante : les 23 autres ne deviennent pas des preuves expérimentales.

Le classement automatique facilite la revue, mais n’est pas une ontologie scientifiquement validée. Les mentions négatives complexes, synonymes non prévus et intentions implicites nécessitent une revue humaine. Toutes les sources restent accessibles pour corriger le routage sans modifier la séance.
