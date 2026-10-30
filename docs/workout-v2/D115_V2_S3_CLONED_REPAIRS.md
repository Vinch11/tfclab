# D1.15 — S3 70.3 : première vraie tentative de modification des séances par V2

**Branche uniquement expérimentale, aucun déploiement.** Suite #440.

Objectif : sortir des calculs de ratios sans calendrier, et mesurer si les recettes d'endurance V2 paramétrables peuvent fournir des durées exactes **en remplaçant uniquement des séances A non-clés**. La recherche opère sur les trois S3 historiques et préserve l'intégralité du plan de 4 semaines dans une **copie isolée**. Elle conserve les mêmes jours, sports, nombre de séances, volume total, brick source et semaine de compétition prévue à S12.

Les modifications éventuelles sont vérifiées par `fitWorkoutV2ToDuration` et `previewV2InPlan` (étapes structurées calculées exactement), puis **les trois validateurs sportifs natifs inchangés** sont rejoués via `nativeChecks` de D1.8. Les sorties avant/après indiquent les erreurs critiques restantes et celles introduites. Le résultat peut être `candidate_native_rechecked` même si des erreurs critiques persistent : cela signifie uniquement que les contrôles ont été exécutés, **jamais** que la dose ou la prescription est approuvée.

Modèles autorisés : `V2_BIKE_01` (RPE endurance) et `V2_RUN_02` (RPE endurance), objectif half, phase base, athlète synthétique trained. **Aucune FTP, VMA, CSS ou réponse à un limiteur n'est fabriquée.** Les séances clés, les fiches hors catégorie A et les profils à intention non adaptée restent intouchés. Variation limitée à ±30 minutes et ±35 % par séance, puis optimisation déterministe du moindre volume modifié, à volume d'endurance constant.

**Réserves bloquantes :** le RPE seul ne prouve pas LT1, la dose individuelle n'est pas validée ; les plafonds de variation sont des limites expérimentales prudentes, pas une preuve clinique. Toute adaptation exige validation des contraintes de l'athlète, de la progression, du placement des séances, des limiteurs et de la structure complète du plan.

Aucune mutation du catalogue V1, de la politique SPORT_RATIO_TARGETS, de DET ENGINE, de main, de Supabase, de Nolio ou de la production. Aucune sauvegarde ni export. CI et résultats à vérifier sur SHA final.
