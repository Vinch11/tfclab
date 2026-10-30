# Longue vélo : deux interprétations de phase

DRAFT — NO-GO. Tous les cas sont synthétiques. Complétude technique, compatibilité de calendrier, admissibilité individuelle et approbation coach sont distinctes. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée.

Source `SEILER_BIKE_Z1_LONG`, texte brut `src/lib/workoutLibrary.ts:5968`. Corps générique 90–180 min, périphéries intégrées ; variante Ironman 180–210 min. Intersection littérale 180 min. Le catalogue annonce 90–210 min, ce qui ne suffit pas à résoudre la contradiction des contenus.

**A : variante obligatoire dès la base.** Les quatre conflits sont conservés. **B : générique en base, variante spécifique plus tard.** Proposition de politique, non autorisée : elle résoudrait seulement la sélection de variante en base. Elle ne prouverait ni tolérance, intensité complète, récupération ni préparation spécifique Ironman. Aucune réservation n’est augmentée à 180 min, aucune autre discipline réduite.

| Semaine | Réservation | Enveloppe déclarée | Réservé/budget hebdo | A compatible | B plage générique seulement |
|---|---|---|---|---|---|
| 1 | 120 | 180 min | 465/480 | non | oui |
| 2 | 130 | 180 min | 485/528 | non | oui |
| 3 | 145 | 180 min | 500/580 | non | oui |
| 4 | 105 | 180 min | 285/420 | non | oui |


Les chemins inspectés ne fournissent pas de dérogation explicite générique/base : `sessionCatalogueContract.ts:7` réserve les variantes exécutables aux plages numériques explicites ; `workoutCatalogBuilder.ts:678` et `prepareGenerationContracts.ts:175` décrivent même les longues sorties jusqu’à 210 min comme possibles en base, sans règle imposant leur dose à chaque semaine. Les variantes restent distinctes de l’éligibilité par phase. Cette lecture ciblée ne prétend pas prouver l’absence d’une règle dans tout document externe.

FTP265W donne le sous-contrôle source 145,75–190,8W à 55–72%FTP, avec plafond strict sur le plat et consignes des côtes conservés. FCmax manque ; aucun âge→FCmax inventé. La politique B ne résout pas ce manque.

Le ventilateur reste contextuel : intérieur avec ventilateur déclaré satisfait cette restriction littérale ; intérieur sans ventilateur est refusé ; dehors rend faux l’antécédent home trainer pour cette restriction uniquement ; contexte inconnu reste inconnu. Les métadonnées et résultats historiques ne sont pas effacés. Ces quatre cas sont rejoués dans la non-régression V27. La tolérance individuelle reste non démontrée dans tous les cas.

La semaine4 conserve son statut de récupération et ses contrôles. Une lecture générique/base ne justifierait pas mécaniquement une charge longue de développement pendant une semaine allégée. Les conséquences au-delà de quatre semaines et la spécificité Ironman restent à examiner.
