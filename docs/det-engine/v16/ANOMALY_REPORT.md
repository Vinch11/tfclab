# Anomalies, inconnues et couverture

Le registre global se trouve dans [conversion-reports.jsonl](evidence/final/conversion-reports.jsonl) et [ANOMALIES.csv](ANOMALIES.csv). [quality-register.jsonl.gz](evidence/quality-register.jsonl.gz) joint les 920 fiches canoniques aux audits temporels V13/V14, avec ID et empreintes ; [quality-dashboard.json](evidence/quality-dashboard.json) sépare le conflit temporel prouvé de la couverture inconnue. Il comprend toutes les fiches, les IDs et les empreintes. Les données détaillées de l'audit temporel préexistant sont dans `integration-study.json`, section temporalAudit.

| Contrôle V16 | Occurrences | Signification |
| --- | --- | --- |
| RECIPE_NOT_FULLY_EXECUTABLE | 920 | Couverture du parseur strict insuffisante, pas invalidité sportive démontrée |
| PHYSIOLOGY_UNDOCUMENTED | 895 | Métadonnée explicite absente, ne pas inventer une adaptation |
| DOMAIN_UNRESOLVED | 898 | Domaine explicite absent ; tâches non métaboliques incluses |
| PHASE_ENRICHMENT_DIVERGENCE | 139 | Deux états source/opérationnel conservés, revue de portée |
| BRICK_COMPONENTS_UNRESOLVED | 63 | Brick explicite ; doses/transitions non certifiées par le convertisseur |
| TRAIL_EXPOSURE_INCOMPLETE | 232 | Exposition spécifique potentielle, tolérance individuelle inconnue |
| MIXED_SPORT_SEMANTICS_UNRESOLVED | 25 | Sport mixed ambigu, ne pas le transformer automatiquement en brick |
| NONCANONICAL_ZONE_LABEL | 33 | Libellé composite/non métabolique à interpréter, pas automatiquement une intensité invalide |


Les sévérités `blocking_automatic_execution`, `technical_blocker`, `review_required` concernent la nouvelle couche. Elles ne remplacent aucune sévérité historique ni aucune condition V14. La bibliothèque historique reste utilisable dans son périmètre antérieur.

## Audit temporel réutilisé sans modification

| Statut V13 | Fiches |
| --- | --- |
| advertised_range_partly_outside_demonstrated_recipe | 69 |
| complete_literal_temporal_bounds_compatible | 7 |
| temporal_coverage_unknown | 779 |
| partial_timing_bounds_only | 57 |
| unattributed_advertised_session_time | 7 |
| mandatory_components_conflict_with_advertised_total | 1 |


V14 fournit 74 bornes de contenu déclaré couvertes, sans prouver l'exécution réelle. Les catégories ne sont pas des avis scientifiques. Les plages partiellement incompatibles et temps non attribués demandent une revue du protocole ; aucun texte ou minimum sportif n'est automatiquement changé.

**Témoin bloquant : `C_BRICK_TRANSITION_DRILL`.** Plage annoncée 30–45 min ; échauffement vélo 15 +5×(vélo 3+course 3) +retour course 10 =55 min actives, soit vélo 30 et course 25. Temps de transition inconnu. Ni 45 min complètes, ni 55 min de vélo autonome. La fiche reste consultable mais la dose contradictoire est refusée par le contrat temporel existant. V13 conserve déjà une proposition séparée d'overlay ; V16 ne la promeut pas.

Aucune collision d'ID ou copie de contenu exactement identique hors ID détectée. L'équivalence physiologique des variantes proches n'a pas été auditée automatiquement. Les libellés Force/Gainage/Mental/Respiratoire ne sont pas convertis en haute intensité. Un objectif trail compatible ne signifie pas qu'une nage nécessite une tolérance excentrique : les signalements terrain ciblent les consignes/sports concernés.

## Ordre de revue proposé

1. Protocoles avec conflit arithmétique ou prérequis de sécurité explicite.
2. Sources réellement retenues dans les calendriers V14–V15 : nages complètes, posture aéro, circuit musculaire et durées réelles.
3. Bricks et expositions trail spécifiques : composantes, D−, terrain et tolérance individuelle.
4. Familles de doses répétées : préciser les repos/transitions et paramètres sans perdre les consignes.
5. Attribution bibliographique et cohérence des adaptations ; validation coach par famille.

Ce classement prépare des travaux ultérieurs ; aucune des 920 conversions n'est déclarée scientifiquement relue par ce classement.
