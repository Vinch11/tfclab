# Compilation exhaustive des 920 fiches

| Discipline source normalisée | Total | Complètes | Partielles | Ambiguës | Contradictoires | Non métaboliques/descriptives |
| --- | --- | --- | --- | --- | --- | --- |
| bike | 168 | 20 | 50 | 98 | 0 | 0 |
| run | 416 | 47 | 163 | 205 | 1 | 0 |
| swim | 119 | 0 | 36 | 83 | 0 | 0 |
| brick | 55 | 0 | 39 | 15 | 1 | 0 |
| strength | 127 | 0 | 0 | 0 | 0 | 127 |
| trail | 3 | 0 | 3 | 0 | 0 | 0 |
| mixed | 32 | 0 | 8 | 0 | 0 | 24 |


Total : **67 complètes, 299 partielles, 401 ambiguës, 2 contradictoires, 151 descriptives/non métaboliques**. Une seule catégorie par fiche ; 920 IDs conservés.

La colonne run inclut des fiches trail stockées historiquement comme course. Le sous-ensemble explicitement trail par tag/fichier spécialisé/sport compte 136 fiches ; répartition : {'complete': 18, 'descriptive_non_metabolic': 22, 'partial': 60, 'ambiguous': 36}. C'est un filtre de provenance pour rendre la couverture visible, pas une attribution scientifique par mot-clé. Les trois fiches de sport natif trail ne sont pas masquées par les réussites de course.

La natation reste partielle ou ambiguë : distances connues et composantes conservées, mais temps d'exécution individuel et/ou récupération finale non établis. Aucun protocole n'est tronqué pour atteindre 45 minutes. Aucun des 55 bricks natifs n'est déclaré entièrement compilé avec transitions résolues. Les 127 fiches de force sont reconnues comme nécessitant un modèle technique distinct ; elles ne sont pas déclarées invalides faute d'un temps métabolique.

## Causes récurrentes

| Cause/inconnue | Fiches concernées |
| --- | --- |
| composite_or_nonleading_quantities | 495 |
| execution_quantity_missing | 379 |
| last_recovery_occurrence_not_specified | 208 |
| repetition_recovery_not_specified | 186 |
| individual_elapsed_time_for_distance_unknown | 159 |
| brick_legs_or_transition_contract_unresolved | 63 |
| conditional_or_alternative_execution | 52 |
| multidiscipline_transition_and_occurrence_schedule_unresolved | 44 |
| unresolved_execution | 39 |
| external_repeat_recovery_unresolved | 39 |
| additional_or_embedded_execution_unresolved | 17 |
| empty_instruction | 10 |
| integration_relationship_not_proven | 7 |
| coaching_annotation_changes_execution | 2 |


Les occurrences de causes ne s'additionnent pas en nombre de fiches. Les 104 comparaisons de repos portent sur des répétitions dont les deux éléments travail/repos ont une durée connue ; elles ne règlent pas toutes les autres ambiguïtés.

## Contradictions et erreurs de portée

- `C_BRICK_TRANSITION_DRILL` : 55 min actives connues contre 30–45 annoncées ; transition inconnue. Aucun crédit artificiel de vélo long.
- `V3_RUN_10K_TEMPO_CRUISE` : 15 +4×(5+1) +10 =49 min, contre un minimum annoncé de50. Discordance technique du total, pas preuve d'un danger physiologique à49 min ; aucune minute ajoutée pour obtenir du vert.
- `B_TR_FARTLEK_TRAIL_10x1_2` : 40 min décrites et 50–75 annoncées, sans périphériques décrits. Classée ambiguë : du temps non attribué n'est pas automatiquement une contradiction physiologique.
- `V2_RUN_MENTAL_FATIGUE` : préparation cognitive30 +course60 ; portée de la durée annoncée55–70 à clarifier. Le temps cognitif n'est pas automatiquement une dose de course.

[recipes.jsonl.gz](evidence/final/recipes.jsonl.gz) et [classification-index.json](evidence/final/classification-index.json) donnent toutes les listes et témoins. Les anciennes configurations et les 600 références restent inchangées ; aucun taux de plans sportifs n'est dérivé de ces comptes de recettes.
