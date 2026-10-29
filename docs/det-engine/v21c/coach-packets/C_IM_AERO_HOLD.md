# Dossier scientifique — C_IM_AERO_HOLD

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : Tenue position aéro IM.

Utilisation archivée : 6 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `a00c4816d6effeff0a9761f583e4e9c442e5a4bbe947f719afdd8763ac98af12`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Main | 4x15' Z2 en position aéro r=5' Z1 | Z2, Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `C_IM_AERO_HOLD@v19:between_repetitions:5a9daecc4fac` | 75 | `8a4841c09d69678d9f99f4600e9950f791d014efba48f816cc8fb000d5f83b13` |
| `C_IM_AERO_HOLD@v19:after_each_repetition:18ae8b1932ab` | 80 | `970b2a53ccc9748caed747b4eb8687f8041ee4811fa78dc5aef6a896a811642f` |

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

- PMID 34540268 (full_main_text_and_xml_tables_examined) : Après un fitting, les sensations de douleur, de fatigue et d’inconfort diminuent à trente jours. Étude non contrôlée chez des vététistes : pas de preuve causale d’endurance aéro ni de tolérance Ironman.
- PMID 27490817 (publisher_403_prior_abstract_only) : Contexte de résumé seulement ; protocole non vérifié intégralement ici.

## Ce qu’elle ne soutient pas

- PMID 34540268 : Distinct open posture-context study after the relay paper was inaccessible; it must not silently replace PMID27490817 or justify an aero interval dose. Mountain-bike population, uncontrolled design, subjective outcomes, no long aero-position tolerance or interval dose tested
- PMID 27490817 : Article complet non obtenu. 403 access denial; no bypass or paid access.

2 comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; 2 comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{
  "avoid": "Douleur lombaire",
  "when": "Toute l'année IM",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": []
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
