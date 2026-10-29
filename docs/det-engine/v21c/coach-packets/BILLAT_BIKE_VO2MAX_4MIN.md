# Dossier scientifique — BILLAT_BIKE_VO2MAX_4MIN

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : 4×4min VO2max Billat-Norvégien — combinaison Billat/Seiler pour adaptations centrales maximales.

Utilisation archivée : 1 occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `047c020c70bedbd58da05980f89d35adda55130198fe07262a8f02553efc624c`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
| Warm-up | 20 min Z1→Z2 + 3×2 min à 100% FTP R:2 min + 2×30s sprint R:3 min | Z1, Z2, Z4, Z5 |
| Main | 4-5×[4 min à 106-110% FTP + 3-4 min récup 50% FTP]. Cadence 90-100 rpm. La puissance cible : chaque répétition doit être à FC ≥ 93% FCmax sur la dernière minute — c'est le marqueur que VO2max est atteint. Réf croisée : Billat 2001 (temps à VO2max) + Seiler 2010 (4×4min comme standard or norvégien) — cette combinaison est le protocole le plus étudié pour améliorer VO2max en cyclisme. FC pic à ≥95% FCmax sur au moins 3 des 4 répétitions = séance réussie. | Z5, Z6, Z1 |
| Cool-down | 15 min Z1 | Z1 |

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
| `BILLAT_BIKE_VO2MAX_4MIN@v19:between_repetitions:2ee538a53f1b` | 77 | `0f72b3829ede34a0f4fee153d02a24da6840c6ca433772f8189e63f881ffdf14` |

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
  "avoid": "VLamax > 0.60 · Fatigue élevée · Semaine de compétition",
  "when": "Build/Peak — standard international du travail VO2max vélo.",
  "necessity": "Recommandé",
  "prerequisites": null,
  "tags": [
    "Billat",
    "Seiler",
    "VO2max",
    "4min",
    "vélo",
    "Norwegian",
    "adaptations centrales"
  ]
}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
