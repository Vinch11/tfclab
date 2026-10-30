# DET-ENGINE V21C — protocoles primaires et dossiers de comparaison

**DRAFT — NO-GO.** Baseline confirmée avant écriture : `1953d108ce50b2962b87bf5b77974235727e2954`, branche `experiment/det-engine`, PR [#420](https://github.com/Vinch11/tfclab/pull/420). Recherche documentaire Codex du 29 octobre 2026 ; aucune revue sportive humaine ni approbation individuelle.

V21C conserve la cohorte et confronte des recettes à des interventions réellement décrites. Aucun changement de séance, de dose, de rendu existant, de moteur, de validateur ou d’export. La note indépendante reste une entrée documentaire et ne vaut pas avis sportif.

| Mesure | Résultat exact et portée |
|---|---:|
| Textes intégraux récupérés en XML | 8 |
| Textes dont corps principal et tableaux XML ont été examinés entièrement | 5 : 4 études primaires + 1 revue systématique |
| Textes examinés seulement par sections | 2 |
| Texte récupéré sans lecture intégrale revendiquée | 1 |
| Entrées au registre, y compris résumés et accès refusés | 11 |
| IDs avec dossier source/candidats | 51 |
| IDs confrontés à au moins un protocole primaire intégral | 12 |
| IDs sans protocole primaire ciblé intégral adéquat ici | 39 |
| Chronologies conservées | 96 |
| Candidats distincts confrontés à un protocole primaire intégral | 22 |
| Lignes de comparaison candidat × étude, ou constat d’absence | 102 |
| Comparaisons concluant à une non-concordance du protocole entier | 24 |
| Comparaisons inconclues faute de protocole intégral/ciblé | 78 |
| Liens de comparaison primaire avec provenance vérifiée | 24 ; ne sont pas des rattachements de dose |
| Nouveaux rattachements exact_recipe_dose admissibles | 0 |
| Doses individuelles approuvées | 0 ; les 96 restent dose_not_individually_verified |
| Revues sportives humaines | 0 |

Un constat de non-concordance ne prouve ni danger individuel ni inefficacité de la séance. Il refuse seulement de présenter cette étude comme preuve de la recette exacte. Les deux brouillons contextuels V21B restent inchangés et ne sont pas promus. Aucun nouvel élargissement des 920 routes scientifiques.

## Lecture des livrables

- [Registre des études](PRIMARY_STUDY_REGISTER.csv) : identité issue des réponses récupérées, URL, date et empreinte réelle ; distinguer accès et lecture.
- [Comparaisons](EXACT_PROTOCOL_COMPARISONS.csv) : 102 lignes, travail/repos/ancre/population/fréquence, limites, données individuelles manquantes et refus de dose exacte.
- [Accès aux textes](FULL_TEXT_ACCESS_LOG.md), [désaccords](SCIENTIFIC_DISAGREEMENTS.md), [récupérations](RECOVERY_CONTEXTS.md).
- [Dossiers coach](COACH_REVIEW_PACKETS.md) : priorités et 51 pages documentaires, distinctes des 920 rendus de séances.
- [Validation](VALIDATION.md) et [reprise](REPRISE.md).

## Provenance et méthode

L’archive fournie est conservée dans `input/`, ses deux fichiers texte vérifiés contre le manifeste fourni. Le contrôle V21B est rejoué sans réactiver ses unités clôturées. Les six écarts bibliographiques hérités et les trois collisions d’identifiants du relais sont corrigés uniquement dans des registres séparés.

`evidence/release-comparisons/source-id-dossiers.jsonl` préserve intégralement la fiche effective, ses restrictions et variantes, chaque candidat V19 et sa revue V20. La source effective conserve son SHA V21A ; le SHA candidat est calculé sur le JSON UTF-8 compact de l’objet candidat complet inchangé, ordre des clés conservé. Cette empreinte n’est pas une empreinte d’article ni une nouvelle version de dose.

Les SHA des réponses portent sur les octets réellement reçus avant compression. Le refus HTTP 403 ne reçoit aucun SHA fictif. Une réponse HTTP 200 de métadonnées DOI n’est pas un article lu. Les suppléments externes, figures non textuelles et sources citées ne sont pas réputés examinés par la seule lecture du XML principal.

Les principes documentés de Dan Lorang restent ceux de V8–V21B : partir du profil et du limiteur, choisir un stimulus, considérer récupération et réévaluation. Ils ne constituent ni une loi quantitative ni une preuve du dernier repos ou d’un dosage exact.

## Limites et prochaine étape

La priorité est une revue qualifiée des ancres d’intensité, des repos finaux indéterminés et de la transférabilité, avec accès aux méthodes primaires manquantes, surtout sur les séances réellement fréquentes. Aucune dose individuelle ne peut être approuvée par cette seule recherche. Les blocages Ironman archivés restent présents. Aucune dépendance payante, connexion Nolio, migration, publication de produit, fusion ou déploiement.
