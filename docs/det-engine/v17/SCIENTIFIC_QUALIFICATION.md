# Qualification scientifique : registre complet, validation non acquise

La [matrice JSON](evidence/qualification-final.jsonl.gz) et [son CSV](SCIENTIFIC_MATRIX.csv) couvrent les 920 fiches : revendication source, physiologie explicite, justification lorsqu'existante, méthode de construction, mentions bibliographiques, niveau de preuve applicable, hypothèses TFCL, preuves individuelles manquantes, restrictions, incertitudes et priorité de revue.

**0 fiche scientifiquement promue ou validée individuellement par V17.** 25 métadonnées physiologiques sources sont conservées ; elles ne sont pas transformées en preuves d'efficacité de toutes les doses. Les mécanismes non évalués restent explicitement non évalués.

Aucun des liens individuels repérés dans les fiches ne correspond exactement à une URL de la bibliographie V8 vérifiée (0 correspondance). Les mentions auteur/année ne sont pas jointes automatiquement comme preuves. Les 12 références de contexte V8 et les commentaires des modules restent disponibles, sans attribution automatique à leurs séances.

## Trois annotations documentaires ciblées

- `D_BIKE_RECOVERY` et `D_RUN_REGEN` : Van Hooren & Peake2018, [PMID29663142](https://pubmed.ncbi.nlm.nih.gov/29663142/), DOI10.1007/s40279-018-0916-2. Revue narrative sur les retours au calme actifs ; la plupart des bénéfices de récupération couramment supposés ne sont pas établis. Cette revue ne valide pas directement une séance séparée de30–60 min de vélo ou20–45 min de course ni sa tolérance individuelle.
- `SEILER_BIKE_Z1_LONG` : Maunder et al.2021, [PMID33886100](https://pubmed.ncbi.nlm.nih.gov/33886100/), DOI10.1007/s40279-021-01459-0. Les attributs physiologiques évoluent pendant un effort prolongé ; suivre la durabilité est pertinent. Cela ne démontre ni la dose90–180 min ni les pourcentages propres à cette fiche ni une conséquence universelle du passage en Z3.

Ces associations sont des annotations documentaires explicites sur trois protocoles relus, pas une correspondance lexicale étendue aux 920 fiches. Deux résumés publics ont été lus ; aucun texte intégral acheté ou revue experte humaine prétendue. [Provenance](evidence/scientific-retrieval.json) : métadonnées, URL, SHA de réponse et bref extrait ; les résumés complets ne sont pas publiés dans le dépôt.

## Priorisation

| Priorité | Fiches | Justification |
| --- | --- | --- |
| 0 | 2 | Discordance structurelle de source |
| 1 | 19 | Fiche utilisée dans les calendriers archivés V14 |
| 2 | 30 | Prérequis structurés explicites |
| 3 | 869 | Autres familles à qualifier |


Les occurrences V14 sont ventilées par profil et modèle ; elles ne représentent pas autant d'athlètes. La matrice distingue prescriptions de force, endurance, technique et récupération. L'absence d'un modèle métabolique classique n'est pas un défaut scientifique d'un exercice de mobilité ou de force.

Les principes documentés de Lorang (contexte, besoin du moment, équilibre et réponse observée), la doctrine TFCL et les réserves V8–V16 sont conservés. Aucun principe n'est converti en quota universel ou prédiction d'adaptation acquise.
