# Accès effectif et lecture

Le journal distingue **récupération**, **lecture documentaire par Codex** et **approbation sportive humaine** (0). Les URL et artefacts complets sont dans le registre CSV et `evidence/release-comparisons/study-registry.json`. Pas de contournement de l’accès éditeur ni d’achat.

| Clé | PMID | Portée réelle | Horodatage UTC | SHA-256 de la réponse |
|---|---|---|---|---|
| `acute_cycle_3_3` | 34822448 | full_main_text_and_xml_tables_examined | 2026-10-29T12:30:17.114105+00:00 | `1ac644ed8df8f228fa1d74fd3c60d97e054635f68be44a873cd6512746fe1351` |
| `chronic_run_4_4` | 36314990 | full_main_text_and_xml_tables_examined | 2026-10-29T12:30:18.125950+00:00 | `548d03290714bf7309b21762baea4ced4cbce90f1d931088b82338b1b2473bc9` |
| `low_cadence_primary` | 24550843 | full_main_text_and_xml_tables_examined | 2026-10-29T12:32:19.749308+00:00 | `78b7b3061100b8071789526b29ad7fef2bc2abf0738eec0ec23473fb8f236021` |
| `longterm_recovery_review` | 38443585 | full_main_text_and_xml_tables_examined | 2026-10-29T12:30:17.310883+00:00 | `b51cf237a153c3059437d3c791f3ef3a199ced6e86fc5984a893ae05280914d0` |
| `posture_160_primary` | 34540268 | full_main_text_and_xml_tables_examined | 2026-10-29T12:44:27.146081+00:00 | `b2f327e3e37d91c362873c0fa07884c8b30079226f7feaf6274c118c181bdb6e` |
| `cooldown_review` | 29663142 | selected_full_text_sections_only | 2026-10-29T12:30:17.314833+00:00 | `931f98f6d0e52e9b3fc05e2d05d51230f0e31f01bf7440ea7396e77780a8fe73` |
| `triathlon_transition_primary` | 36589784 | selected_full_text_sections_only | 2026-10-29T12:30:18.402851+00:00 | `4985161d5fd0044f5391b8ce430b091898573eaab125de5138d45abd3724b3ec` |
| `strength_economy_review` | 38165636 | retrieved_not_full_text_reviewed | 2026-10-29T12:30:18.308620+00:00 | `d1e43a610357c2676ed0c92c32e711fd99beb2ff7202486c36c8cb6c760f81b6` |
| `posture_primary_publisher` | 27490817 | publisher_403_prior_abstract_only | 2026-10-29T12:30:18.126290+00:00 | `absent : pas de réponse archivée` |
| `swim_primary_publisher` | 39526869 | metadata_response_not_full_text_prior_abstract_only | 2026-10-29T12:30:19.152376+00:00 | `d98e16013b22b654f0b7a568446ec21fcda71e7e72e55484b8859cde4224ca68` |
| `seiler_21812820` | 21812820 | abstract_reviewed_full_text_not_obtained | 2026-10-29T12:41:24.867741+00:00 | `9c4beb3e6fd84dacf596a573e0423c6ee43352c1523d23143ec660568b68000b` |

## Textes principaux examinés

- PMID 34822448 : étude aiguë cycliste 3/3 ; Methods, Results, Discussion et Conclusions, tableaux XML.
- PMID 36314990 : essai chronique de course 4×4 ; protocole entier, tableaux et attrition. 48 randomisés, 31 analysés : ne pas décrire 48 résultats complets.
- PMID 24550843 : essai cycliste basse cadence ; méthodes, résultats et discussion. Le conflit sur le volume des repos est conservé.
- PMID 34540268 : fitting vélo, étude avant/après non contrôlée ; méthodes, tableaux, résultats et limites. Ce texte ouvert distinct ne remplace pas PMID 27490817.
- PMID 38443585 : revue systématique récupération, texte et tableaux ; portée secondaire, pas un protocole primaire commun.

Deux protocoles primaires permettent de décrire le contraste étudié sans contradiction de recette identifiée ici (3/3 aigu et 4×4 course). Les deux autres textes primaires entièrement lus restent détaillés mais insuffisants pour une concordance exacte : repos contradictoires en basse cadence et intervention de fitting sans recette d’entraînement. Le nombre de textes lus ne doit pas être présenté comme le nombre de protocoles de dose complets.

Les huit XML ont un corps d’article. Trois autres ont des lectures limitées : PMID 29663142 (Introduction/Methods seulement), PMID 36589784 (Materials and methods et tableaux 1–2 seulement), PMID 38165636 (récupéré, pas de lecture intégrale revendiquée). Aucun résultat non lu n’est emprunté au texte intégral.

## Accès incomplets

- PMID 27490817, DOI 10.1080/02640414.2016.1215496 : éditeur HTTP 403. L’ancien résumé V21B est conservé ; pas d’empreinte inventée pour le refus.
- PMID 39526869, DOI 10.23736/S0022-4707.24.15931-2 : HTTP 200 mais corps **JSON de métadonnées Crossref**, pas texte primaire de natation. Le protocole complet et la transférabilité entre nages restent inconnus.
- PMID 21812820, DOI 10.1111/j.1600-0838.2011.01351.x : identité et résumé récupérés via Europe PMC ; les liens recensés nécessitent un abonnement, texte complet non obtenu. Les repos ne sont pas reconstruits à partir de la fiche TFCLab.

Les recherches d’articles ouverts basse cadence et posture sont archivées également (`retrieval-1/force_primary_search`, `retrieval-3/posture_open_search`). Le résultat non sélectionné n’est pas une source lue. Aucun appui primaire de musculation lourde n’est revendiqué ; basse cadence et force en salle ne sont pas assimilées. La cohorte des 51 IDs ne contient aucune recette de natation ou de force en salle : ne pas lui attribuer ces articles pour améliorer la couverture.

Les métadonnées des 46 références V21B, dont les six écarts, sont vérifiées par rejeu de l’artefact archivé et de son empreinte, sans nouvelle lecture intégrale revendiquée.
