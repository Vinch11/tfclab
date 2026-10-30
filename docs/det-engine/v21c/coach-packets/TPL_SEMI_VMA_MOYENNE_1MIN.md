# Dossier scientifique — TPL_SEMI_VMA_MOYENNE_1MIN

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : VMA moyenne 1' — volume à 100-105% VMA.

Utilisation archivée : 0 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `e37f34feeba48e42700c0ff08e33eb546650c30ed3f63e5e111d9ab0d56d095a`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20' progressif Z1→Z2 | Z1, Z2 |
| Main | 15 x 1' Z6 (100-105% VMA) r:1' Z1 | Z6, Z1 |
| Cool-down | 10' Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `TPL_SEMI_VMA_MOYENNE_1MIN@v19:between_repetitions:8deb50079461` | 59 | `88f8adeeb9034107b993789b97d43dd2e27729ad2383eae5c7e10a146b33c14c` |
| `TPL_SEMI_VMA_MOYENNE_1MIN@v19:after_each_repetition:5afe7aa40a58` | 60 | `0f23627c16ae8882197573ce32276aa3c4644c9ef2d5196801be331a39916318` |

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

- PMID 36314990 (full_main_text_and_xml_tables_examined) : Après huit semaines, le groupe 4×4 course a davantage augmenté son VO2max que les deux groupes sprint étudiés. Population masculine sélectionnée, attrition importante ; pas de transfert direct au vélo.

## Ce qu’elle ne soutient pas

- PMID 36314990 : Running 1-min VMA recipe is a different dose; bike 4-min recipes are explicit transfer counterexamples despite a superficially similar interval label. Male selected sample, no direct bike transfer, protocol-specific training volume, no individual TFCL dose established; some SIT intolerance reported

2 comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; 0 comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{
  "avoid": "Si VO2max déjà stressé cette semaine",
  "when": "Phase Développement Moteur (S2-S3)",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": [
    "vma",
    "1min",
    "template-semi",
    "phase1"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
