# TFCLab V3 — Shortlist 70.3 pour revue sportive D1 (NON ADMISSIBLE)

**Périmètre :** 20 fiches candidates parmi 400 et 8 bricks expérimentaux (>100 min). Aucun profil réel ni ordonnance; cette sélection facilite une revue coach, elle n'est **ni une validation scientifique, ni une autorisation du moteur**.

| Sport | ID | Séance candidate | Intention | Durée/volume de base | Niveau minimum |
|---|---|---|---|---|---|
| bike | `V3P_BIKE_002` | Endurance LT1 continue | `moderate_lt1` | 80 min | light |
| bike | `V3P_BIKE_007` | Sous-seuil extensif 4 blocs | `mlss` | 77 min | trained |
| bike | `V3P_BIKE_008` | LT2/MLSS fractionné | `mlss` | 78 min | trained |
| bike | `V3P_BIKE_010` | VO2 long 5×3 min | `vo2max` | 59 min | trained |
| bike | `V3P_BIKE_012` | Spécifique 70.3 position aéro | `race_specific` | 100 min | trained |
| bike | `V3P_BIKE_039` | 70.3 : simulation par étages | `race_specific` | 119 min | trained |
| bike | `V3P_BIKE_084` | 70.3 départ conservateur | `race_specific` | 95 min | trained |
| bike | `V3P_BIKE_090` | 70.3 ravitaillement entre blocs course | `race_specific` | 132 min | trained |
| run | `V3P_RUN_002` | Endurance sous LT1 | `moderate_lt1` | 55 min | light |
| run | `V3P_RUN_008` | Seuil 3×10 min | `mlss` | 66 min | trained |
| run | `V3P_RUN_009` | VO2 5×3 min en temps | `vo2max` | 59 min | trained |
| run | `V3P_RUN_041` | Tempo continu inférieur au seuil | `race_specific` | 42 min | trained |
| run | `V3P_RUN_076` | Semi : sous-allure puis allure cible | `race_specific` | 54 min | trained |
| swim | `V3P_SWIM_005` | Endurance 200 m réguliers | `moderate_lt1` | 2100 m — durée non déterminée | light |
| swim | `V3P_SWIM_007` | CSS : répétitions de 100 m | `mlss` | 1700 m — durée non déterminée | trained |
| swim | `V3P_SWIM_018` | 70.3 : 3×700 m spécifique | `race_specific` | 2600 m — durée non déterminée | trained |
| swim | `V3P_SWIM_057` | Orientation de visée tous les 8 cycles en bassin | `technique_economy` | 1550 m — durée non déterminée | light |
| swim | `V3P_SWIM_063` | CSS 10×100 m repos bref | `mlss` | 1600 m — durée non déterminée | trained |
| strength | `V3P_STRENGTH_001` | Squat force maximale | `max_strength` | ~34 min (estimé) | trained |
| strength | `V3P_STRENGTH_008` | Tronc antirotation et stabilité | `mobility_prevention` | ~24 min (estimé) | light |

## Contrôles prioritaires pour trois profils D1

**Profil aérobie limité :** confronter le déficit réel (LT1/VO2/économie) au domaine des séances, à l'historique qualitatif et au volume déjà prévu. Les fiches VO2 ne sont pas automatiquement appropriées : niveau, récupération inter-sessions et stabilité des repères requis.

**Profil glycolytique / VLamax haut :** ne pas présumer qu'une séance diminue VLamax. Prioriser un examen du volume aérobie soutenable et du seuil avec incertitude ; les sprints restent exclus par défaut sans objectif sportif précis.

**Profil 70.3 équilibré :** vérifier la distribution natation / vélo / course en **minutes réelles**, la comptabilisation des transitions, le nombre de séances exigeantes, la progression hebdomadaire et le statut de la semaine de course. Une séance admissible seule peut produire un microcycle inapproprié.

## Bricks de 100 min et plus (candidats)

Les références `V3B_703_001..005` sont stockées dans `scripts/library-v3/brickComposer.ts`. Les composantes sont préservées sans troncature et la transition est explicite. En particulier, `V3B_703_002` utilise `V3P_BIKE_084 + V3P_RUN_002`. Ce travail apporte des **candidats de durée**, pas une preuve de réussite D1 : la cohérence semaine, récupération, phase, limites et quotas reste entièrement à tester.

## Décision

- **20/20 à revoir** : documenter objectif et limiteur réellement visés, niveau, temps, charge et risques, puis approuver/refuser *individuellement*.
- Aucune activation V3 avant ces revues et les preuves de sauvegarde/édition/réouverture sur Supabase isolé.
- Ne pas toucher à l'ancienne bibliothèque pour rendre ces essais possibles ; maintenir les protections D1.
