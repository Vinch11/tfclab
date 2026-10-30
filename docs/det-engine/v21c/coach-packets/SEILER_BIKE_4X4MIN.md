# Dossier scientifique — SEILER_BIKE_4X4MIN

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : 4×4min Seiler vélo — standard VO2max polarisé (séance haute intensité référence).

Utilisation archivée : 0 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `e47d1a24d7cdc04767d94d46d731f59148fccf290432db233da2ae61aa3e3c90`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20 min Z1→Z2 + 2×2 min à 95% FTP R:2 min | Z1, Z2, Z4 |
| Main | 4×4 min à 106-115% FTP (Z5) R:3 min 50% FTP. Cadence 90-105 rpm. Sur les 2 dernières minutes de chaque répétition : FC cible ≥ 93% FCmax. Réf : Seiler 2013 — même protocole que la course, adapté au vélo. La puissance est facile à contrôler précisément. IMPORTANT : la récupération à 50% FTP (et non arrêt complet) est essentielle pour maintenir la cinétique VO2 et réduire le lactate progressivement, permettant la répétition suivante d'atteindre VO2max plus rapidement. | Z5, Z6 |
| Cool-down | 15 min Z1 cadence libre | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `SEILER_BIKE_4X4MIN@v19:between_repetitions:0d317809497b` | 66 | `d1645ce03adbe2e1109abb993678b65cdcff91b18dddae0543ef821d6bbec324` |

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

- PMID 34822448 (full_main_text_and_xml_tables_examined) : À puissance et temps de travail contrôlés, les réponses cardio-respiratoires pendant les efforts longs diffèrent de celles des efforts courts. Mesures aiguës ; aucune adaptation chronique démontrée.
- PMID 36314990 (full_main_text_and_xml_tables_examined) : Après huit semaines, le groupe 4×4 course a davantage augmenté son VO2max que les deux groupes sprint étudiés. Population masculine sélectionnée, attrition importante ; pas de transfert direct au vélo.
- PMID 21812820 (abstract_reviewed_full_text_not_obtained) : Le résumé compare 4×4, 4×8 et 4×16 chez des cyclistes et rapporte globalement davantage de gains pour 4×8 dans cet échantillon. Le texte intégral et les repos restent non vérifiés.

## Ce qu’elle ne soutient pas

- PMID 34822448 : Explicit cycling interval recipes in the source, including 3/3 or 4/3–4 patterns; compare the actual anchors and whole session, not the VO2 label. Recreational males; acute mechanistic contrast; equal work rates; not an individual optimum, not FTP-based prescription
- PMID 36314990 : Running 1-min VMA recipe is a different dose; bike 4-min recipes are explicit transfer counterexamples despite a superficially similar interval label. Male selected sample, no direct bike transfer, protocol-specific training volume, no individual TFCL dose established; some SIT intolerance reported
- PMID 21812820 : Article complet non obtenu. Primary article identity and abstract only; full methods remain unavailable in retrieved source links

2 comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; 1 comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{
  "avoid": "Plus de 2x/semaine · Fatigue élevée · Home trainer sans ventilateur (FC monte artificiellement)",
  "when": "Build/Peak — 1-2x/semaine. 15-20% du volume en haute intensité.",
  "necessity": "Recommandé",
  "prerequisites": {
    "requireVerifiedProfile": true,
    "requireExplicitCoachApproval": true
  },
  "tags": [
    "Seiler",
    "4x4min",
    "VO2max",
    "vélo",
    "polarisé",
    "haute intensité",
    "Norwegian"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
