# Dossier scientifique — C_BIKE_FORCE_LOW_CAD

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : Force basse cadence (50–60 rpm, recrutement neuromusculaire).

Utilisation archivée : 3 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `5946b4fcca2b030499c6083bc5eb8c5ce0e344531f0715a7cdcdc205d37b6974`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 15' Z1–Z2 cadence libre | Z1, Z2 |
| Main | 6x5' Z3 cadence 50–60 rpm (assis) r=5' Z1 cadence libre | Z3, Z1 |
| Cool-down | 10' Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `C_BIKE_FORCE_LOW_CAD@v19:between_repetitions:5e10bf4141c7` | 80 | `59546ce98f9605f4143911529a82efd99780efeade4c172de897dd7ce09a2757` |
| `C_BIKE_FORCE_LOW_CAD@v19:after_each_repetition:06666c9dfdbf` | 85 | `c77a216d676d14ed0412418809497a6624008d67ec29211e16b5b6c467790d8a` |

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
  "avoid": "Problèmes genoux",
  "when": "Base / Build",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": []
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
