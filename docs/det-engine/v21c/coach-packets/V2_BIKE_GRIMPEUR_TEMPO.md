# Dossier scientifique — V2_BIKE_GRIMPEUR_TEMPO

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : Tempo grimpeur — 2x25' en bosse Z3 (75-82% FTP) cadence libre. Endurance montée longue.

Utilisation archivée : 0 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `ca735aa563b80868dca8eb99775894600dc657b9d5d99dbbb7d225d5f9654edc`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20' progressif terrain vallonné | Z1, Z2 |
| Main | 2 x 25' en montée soutenue Z3 (75-82% FTP). Cadence naturelle 70-80rpm. R:8' descente | Z3 |
| Cool-down | 10' Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `V2_BIKE_GRIMPEUR_TEMPO@v19:between_repetitions:4c25f3875bc0` | 88 | `17d4c88552c72132f3e583644a3cc3f849905306a7aec96718c1ad908a5c36a2` |
| `V2_BIKE_GRIMPEUR_TEMPO@v19:after_each_repetition:5c6e8b512022` | 96 | `3adfa3e59a0f8441ff995752cbf4bd0c252a4ff0099bf30df375e573fabc5f45` |

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
  "avoid": "Phase base plate",
  "when": "Spécifique montagne",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": [
    "grimpeur",
    "tempo",
    "montée",
    "endurance-musculaire",
    "vélo"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
