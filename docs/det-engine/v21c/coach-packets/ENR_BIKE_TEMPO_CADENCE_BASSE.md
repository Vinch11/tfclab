# Dossier scientifique — ENR_BIKE_TEMPO_CADENCE_BASSE

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : Tempo cadence basse — 3x20' Z3 à 55-65rpm. Force musculaire spécifique cyclisme.

Utilisation archivée : 1 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `c26b264c6444ef3243763fe2a072082459950d88744612cc24e1a874dbc286fd`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20' Z2 cadence normale | Z1, Z2 |
| Main | 3 x 20' Z3 (78-82% FTP) à 55-65 RPM. Force spécifique sans lactate. R:5' Z1 cadence libre | Z3 |
| Cool-down | 10' Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `ENR_BIKE_TEMPO_CADENCE_BASSE@v19:between_repetitions:73a25c13aa7b` | 100 | `0fe9947313f2c02b5f1b970f8f7531ab2cc4c5922952de5e44780903b0c0cd0e` |
| `ENR_BIKE_TEMPO_CADENCE_BASSE@v19:after_each_repetition:7570c895e72c` | 105 | `4fa497a3df668f826aea75567558edb12f6930f7288e67c6204521cc3cd13740` |

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

- PMID 24550843 (full_main_text_and_xml_tables_examined) : Le groupe basse cadence ne présente pas d’amélioration significative des critères aérobies, de performance cycliste ou de force étudiés. Ce résultat ne condamne pas toutes les méthodes à basse cadence.

## Ce qu’elle ne soutient pas

- PMID 24550843 : Source cadence, work/rest and power labels are explicit. The high-cadence and climbing recipes are contrast cases, not automatically supported by freely chosen cadence results. Veteran male sample; cadence, HR anchors and duration differ; internal recovery-volume ambiguity; prior training history incompletely known; subgroup strength tests

2 comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; 0 comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{
  "avoid": "Douleur genou",
  "when": "Build/Force",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": [
    "tempo",
    "cadence-basse",
    "force",
    "vélo"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
