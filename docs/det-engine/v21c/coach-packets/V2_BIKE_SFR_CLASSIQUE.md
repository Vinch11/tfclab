# Dossier scientifique — V2_BIKE_SFR_CLASSIQUE

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : SFR classique — 5x8' à 50-60rpm Z3/Z4 en côte (4-6%). Force spécifique vélo.

Utilisation archivée : 10 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `5c6619ca9bc011ead2007e23ddb435618c169858a51ecf19aab594fe998fc0cb`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20' progressif Z1→Z3 | Z1, Z2, Z3 |
| Main | 5 x 8' en côte (4-6%) à 50-60 RPM, Z3/Z4 (85-95% FTP). R:4' moulinage descente. Assis, mains basses, force pure | Z3, Z4 |
| Cool-down | 10' Z1 plat | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `V2_BIKE_SFR_CLASSIQUE@v19:between_repetitions:4ff6b9ff421c` | 86 | `8bd0434579e30a2d14382f64d12712d6db8e7ef188dcef2d7d602de96f0ab690` |
| `V2_BIKE_SFR_CLASSIQUE@v19:after_each_repetition:885d58233b80` | 90 | `bfd7a410f774b9febe2b481dfa28aa6561095fe12442600350455df53b4e7e00` |

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
  "avoid": "Douleur genou, tendon rotulien",
  "when": "Build/Force (S3-S10)",
  "necessity": "Obligatoire",
  "prerequisites": null,
  "tags": [
    "sfr",
    "force",
    "cadence-basse",
    "côte",
    "vélo"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
