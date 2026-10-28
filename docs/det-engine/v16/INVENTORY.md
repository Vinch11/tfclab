# Inventaire exhaustif, périmètre et provenance

Entrée réelle : `src/lib/workoutLibrary.ts`, incluant les tableaux construits programmatiquement, les templates et toutes les extensions poussées dans l'agrégateur. Résultat vérifié contre le module opérationnel réel : **920 occurrences, 920 IDs uniques**, 22 groupes, aucune collision d'ID ni doublon exact de contenu hors ID détecté. Les 2425 entrées de variantes sont des textes attachés aux fiches, pas des séances uniques supplémentaires.

| Source | Export / groupe | Fiches |
| --- | --- | --- |
| src/lib/workoutLibrary.ts | WorkoutLibrary:initial | 304 |
| src/lib/workoutLibrary.ts | ProPackWorkouts | 107 |
| src/lib/templateDerivedWorkouts.ts | TemplateDerivedWorkouts | 50 |
| src/lib/enrichedWorkouts.ts | EnrichedWorkouts | 56 |
| src/lib/enrichedWorkoutsV2.ts | EnrichedWorkoutsV2 | 52 |
| src/lib/enrichedWorkoutsV3.ts | EnrichedWorkoutsV3 | 67 |
| src/lib/enrichedWorkoutsTrail.ts | EnrichedWorkoutsTrail | 68 |
| src/lib/enrichedWorkoutsV4.ts | EnrichedWorkoutsV4 | 19 |
| src/lib/enrichedWorkoutsV5.ts | EnrichedWorkoutsV5 | 11 |
| src/lib/enrichedWorkoutsV6.ts | EnrichedWorkoutsV6 | 9 |
| src/lib/enrichedWorkoutsFatMax.ts | EnrichedWorkoutsFatMax | 14 |
| src/lib/enrichedWorkoutsRecovery.ts | EnrichedWorkoutsRecovery | 28 |
| src/lib/enrichedWorkoutsSwim.ts | EnrichedWorkoutsSwim | 17 |
| src/lib/enrichedWorkoutsSwimV2.ts | EnrichedWorkoutsSwimV2 | 18 |
| src/lib/enrichedWorkoutsStrengthV2.ts | EnrichedWorkoutsStrengthV2 | 32 |
| src/lib/enrichedWorkoutsHedgehog.ts | EnrichedWorkoutsHedgehog | 4 |
| src/lib/enrichedWorkoutsIMRunDurability.ts | EnrichedWorkoutsIMRunDurability | 6 |
| src/lib/enrichedWorkouts 703PodiumDurability.ts | EnrichedWorkouts 703PodiumDurability | 9 |
| src/lib/enrichedWorkoutsLCW.ts | EnrichedWorkoutsLCW | 5 |
| src/lib/enrichedWorkoutsRunHills.ts | EnrichedWorkoutsRunHills | 4 |
| src/lib/enrichedWorkoutsStartToRun.ts | EnrichedWorkoutsStartToRun | 28 |
| src/lib/enrichedWorkoutsShortFormats.ts | EnrichedWorkoutsShortFormats | 12 |


Le manifeste [manifest.json](evidence/final/manifest.json) donne pour chaque occurrence : ID, fichier/export/index, SHA-256 du fichier, empreintes des contenus avant/après enrichissement, sport, plage de durée, phases, objectifs, variantes, champs, W′bal et prérequis. [MANIFEST.csv](MANIFEST.csv) permet une lecture tabulaire des 920 lignes.

L'extracteur évalue uniquement les modules TypeScript locaux nécessaires, sans binding réseau ni processus, et capture avant le premier enrichissement. La liste de dépendances contient 29 fichiers avec empreinte. Aucun code source n'est modifié. [source-bundle.json.gz](evidence/source-bundle.json.gz) archive également le texte intégral des 31 fichiers sources/runtime/types/doctrine, commentaires scientifiques compris. Les références d'un commentaire de module ne sont pas attribuées automatiquement à chacune de ses fiches. Les définitions candidates trouvées dans `libraryDurationIndex.ts` et `workoutCatalogBuilder.ts` sont des index/listes de travail consommateurs, pas deux bibliothèques omises. Les mappings Wahoo/Zwift et plans Excel sont des sources externes/consommatrices distinctes du catalogue de fiches ; les fiches dérivées incluses sont comptées via `TemplateDerivedWorkouts`.

Les enrichissements existants changent 304 champs goals, 139 champs phase, 30 prérequis et 23 métadonnées physiologiques. Le canonique conserve les deux états et chaque différence ; il ne transforme pas les inférences historiques de phase/objectif en preuves scientifiques.

| Discipline normalisée | Fiches | Sans métadonnée physio explicite | Sans domaine métabolique explicite | Prérequis structurés |
| --- | --- | --- | --- | --- |
| bike | 168 | 162 | 162 | 9 |
| run | 416 | 404 | 404 | 13 |
| swim | 119 | 115 | 115 | 3 |
| brick | 55 | 54 | 55 | 0 |
| strength | 127 | 125 | 127 | 5 |
| trail | 3 | 3 | 3 | 0 |
| mixed | 32 | 32 | 32 | 0 |


La catégorie source `course` peut contenir du trail ; les objectifs, tags et consignes terrain sont conservés. `mixed` ne signifie pas nécessairement brick : on y trouve aussi repos, mobilité, respiration, nutrition et LCW. Aucun sport n'est réattribué sur une simple intuition textuelle.
