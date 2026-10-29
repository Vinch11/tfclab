# Dossier scientifique — B_BIKE_VO2_3MIN

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : VO2max, puissance aérobie max.

Utilisation archivée : 0 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `1a0a9cefcb534eec2bb082c3624c5c3889429b03998ec64ed78aa2e72ac3c681`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20 min progressif + 3x30s Z5 r=60s | Z1, Z2, Z5 |
| Main | 5–7x3 min Z5 r=3 min Z1–Z2 | Z5, Z1, Z2 |
| Cool-down | 10 min Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `B_BIKE_VO2_3MIN@v19:between_repetitions:1b764bed2bb4` | 60.5 | `24c55d9b154777bc93253d21099d334175aabcd57edcfdd397e2754f748b7423` |
| `B_BIKE_VO2_3MIN@v19:after_each_repetition:23bb55bfcb95` | 64.5 | `87a8f64a659db2b34fa108706dffd4267ed207aa96d87eb6b9e478ad7810c14a` |

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

- PMID 34822448 (full_main_text_and_xml_tables_examined) : À puissance et temps de travail contrôlés, les réponses cardio-respiratoires pendant les efforts longs diffèrent de celles des efforts courts. Mesures aiguës ; aucune adaptation chronique démontrée.

## Ce qu’elle ne soutient pas

- PMID 34822448 : Explicit cycling interval recipes in the source, including 3/3 or 4/3–4 patterns; compare the actual anchors and whole session, not the VO2 label. Recreational males; acute mechanistic contrast; equal work rates; not an individual optimum, not FTP-based prescription

2 comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; 0 comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{
  "avoid": "Si VLamax trop haute (réduire fréquence) ou fatigue élevée",
  "when": "Build/Peak",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": []
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
