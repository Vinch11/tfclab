# D1.15 — S3 70.3 : première vraie tentative de modification des séances par V2

**Branche uniquement expérimentale, aucun déploiement.** Suite #440.

Objectif : sortir des calculs de ratios sans calendrier, et mesurer si les recettes d'endurance V2 paramétrables peuvent fournir des durées exactes **en remplaçant uniquement des séances A non-clés**. La recherche opère sur les trois S3 historiques et préserve l'intégralité du plan de 4 semaines dans une **copie isolée**. Elle conserve les mêmes jours, sports, nombre de séances, volume total, brick source et semaine de compétition prévue à S12.

Les modifications éventuelles sont vérifiées par `fitWorkoutV2ToDuration` et `previewV2InPlan` (étapes structurées calculées exactement), puis **les trois validateurs sportifs natifs inchangés** sont rejoués via `nativeChecks` de D1.8. Les sorties avant/après indiquent les erreurs critiques restantes et celles introduites. Le résultat peut être `candidate_native_rechecked` même si des erreurs critiques persistent : cela signifie uniquement que les contrôles ont été exécutés, **jamais** que la dose ou la prescription est approuvée.

Modèles autorisés : `V2_BIKE_01` (RPE endurance) et `V2_RUN_02` (RPE endurance), objectif half, phase base, athlète synthétique trained. **Aucune FTP, VMA, CSS ou réponse à un limiteur n'est fabriquée.** Les séances clés, les fiches hors catégorie A et les profils à intention non adaptée restent intouchés. Variation limitée à ±30 minutes et ±35 % par séance, puis optimisation déterministe du moindre volume modifié, à volume d'endurance constant.

**Réserves bloquantes :** le RPE seul ne prouve pas LT1, la dose individuelle n'est pas validée ; les plafonds de variation sont des limites expérimentales prudentes, pas une preuve clinique. Toute adaptation exige validation des contraintes de l'athlète, de la progression, du placement des séances, des limiteurs et de la structure complète du plan.

Aucune mutation du catalogue V1, de la politique SPORT_RATIO_TARGETS, de DET ENGINE, de main, de Supabase, de Nolio ou de la production. Aucune sauvegarde ni export. CI et résultats à vérifier sur SHA final.

## Rejeu GitHub CI #905 — confirmé (SHA `beadf161`)

Tous les jobs CI réussissent (TypeScript/Vitest, Deno, ESLint, Playwright). Ceci **ne vaut pas GO sportif**.

Le témoin `D115_S3_V2_NATIVE_REPLAY` donne :
- `aerobic_dominant` S3 : **blocked**, aucune réallocation trouvée sous la règle « ne pas modifier les créneaux nominalement key et ne remplacer que des séances A non-clés ». Aucun plan modifié.
- `glycolytic_dominant` S3 : **blocked**, mêmes conditions. Aucun plan modifié.
- `balanced_typical` S3 : **no_change_needed** pour les ratios de minutes. **4 erreurs critiques natives encore présentes** : un `sport_ratio` (ancien comptage de séances) et trois `lorang_categories`. Aucun plan approuvé.

### Cause de sélection observée dans les vrais résultats D1.2

Des séances de récupération avec des IDs `D_RECOVERY_VAR_9_PRO`, `D_SEMI_RECOVERY_30` ou `D_IM_BRICK_REGEN` peuvent être marquées `isKeySession=true` parce que le moteur recopie le drapeau d'un **créneau**. Cette étiquette n'est ni preuve de séance de qualité, ni preuve d'un stimulus pour le limiteur. Une séance de catégorie D ne doit jamais passer pour une séance physiologique de catégorie A/B par ce seul booléen.

**Décision d'implémentation suivante :** distinguer `slot.isKeySession` (intention/calendrier) d'une propriété attestée sur la **fiche effectivement choisie** (catégorie / cible / dose / récupération / référence vérifiée). Bloquer la certification des vrais stimuli en l'absence de cette preuve, sans transformer arbitrairement du repos en HIT. Rejouer la sélection sur le même horizon S1–S4 avec les garde-fous natifs. Ne pas assouplir les ratios en production pour masquer ce défaut.

La génération D1 actuelle reste NO-GO ; le changement D1.15 est une épreuve de faisabilité sur une copie et n'a apporté aucune mutation aux deux S3 problématiques.
