# Placement : témoins complets, pas seulement compteurs

Les « trois variantes V23 » archivées sont trois essais de la même politique sur B, B avec plafond course inférieur et B avec récupération défavorable. Chacun avait 35 → 36 avertissements, soit +1 `anti_repetition` en S3. Ce ne sont pas trois algorithmes distincts.

Le contrôle de production `planValidator.ts`, fonction `validateAntiRepetition`, compare chaque titre normalisé avec **la première séance physique du même jour de la semaine précédente**. Les semaines allégées/course sont exemptées. Cette branche contrôle une préférence de diversité de titres; elle ne mesure ni surcharge, ni espacement, ni récupération. D'autres contrôles distincts vérifient les plafonds intra-semaine et les contraintes de placement. Le code et la sévérité warning restent intégralement inchangés.

Nouveaux témoins de répétition de l'essai V23 pour B (mêmes paires dans les deux contrefactuels) :

| Semaine / jour | ID actuel | Minutes précédente → actuelle | Signal exact |
|---|---|---|---|
| S2 mardi | SEILER_BIKE_Z1_LONG | 120 → 130 | même titre malgré une durée différente |
| S2 mercredi | C_BIKE_AERO_POSITION_DRILLS | 85 → 85 | même ID/dose |
| S2 jeudi | C_SWIM_TRI_CATCH_PULL | 35 → 35 | même ID/dose |
| S3 mardi | SEILER_BIKE_Z1_LONG | 130 → 145 | même titre malgré une durée différente |
| S3 mercredi | C_BIKE_AERO_POSITION_DRILLS | 85 → 85 | même ID/dose |
| S3 jeudi | C_SWIM_TRI_CATCH_PULL | 35 → 35 | même ID/dose |

Une sortie 130 → 145 minutes peut donc recevoir le même avertissement qu'une recette strictement répétée. Cela ne permet pas de supprimer l'alerte; les sorties brutes et les paires comparées sont conservées dans `evidence/warning-witnesses.json`.

## Hypothèses limitées et résultat

| Modèle candidat | Nouveaux témoins bruts par cas | Décision |
|---|---|---|
| pull_on_support_day | 12 | proposition coach distincte |
| catch_on_support_day | 12 | proposition coach distincte |
| protect_peak_ride_only | 2 | proposition coach distincte |
| space_peak_bike_block_and_long_run | 0 | retenu comme calendrier candidat |

Les deux premiers modèles conservent les totaux d'avertissements mais échangent 12 témoins bruts par cas (dont 6 `layout_drift` et 6 répétitions). Le troisième échange encore 2 témoins `layout_drift`. Ils ne sont pas retenus automatiquement, même avec zéro erreur du bloc. Ce compromis est visible et soumis au coach.

Le quatrième échange uniquement les jours des deux sorties course **dans la semaine portant la plus grande sortie vélo déjà planifiée**. Les disciplines par jour, les sources et les doses ne changent pas. En S3, le vélo technique reste mercredi; la sortie courte passe jeudi et la longue vendredi. Il existe un jour intermédiaire de course courte avant la sortie longue; ce jour n'est pas déclaré comme repos ou récupération réussie. Le soutien du tronc suit désormais la sortie longue : la source l'autorise même en fatigue, mais la réaction individuelle reste à observer.

Le garde expérimental compare les multiensembles d'issues complets, message compris, en plus des codes/semaine/sévérité/contrôle. Il recalcule la portée quatre semaines et conserve tous les refus. Le quatrième modèle n'ajoute aucun témoin historique et retire une répétition. Aucune permutation exhaustive n'a été lancée : quatre hypothèses explicites seulement, sur les trois cas ayant une priorité admissible à ce niveau de programmation.
