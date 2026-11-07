# Dernier blocage C8 — avant/après

Référence immuable : `429a84c1c35255843251a478ef3f48ab0dd907c6`. Capture indépendante dans un worktree détaché de ce SHA, avec le composant réel et son export V1. Données exclusivement synthétiques ; aucune connexion Supabase réelle ni sauvegarde.

## Cas 0,70 / 85 m

Sans athlète sélectionné, sans protocole lactate structuré :

| Surface | V2.3.1 | V2.3.2 |
| --- | --- | --- |
| Référence dans l'aperçu | **Mesuré (labo) : 0.7** | **VLamax de référence déclarée — provenance scientifique non vérifiée : 0.7** |
| Prédiction | 0.51 | **0.51** |
| Écart | -0.19 | **-0.19** |
| Athlète sélectionné, sans preuve | Même fausse qualification | Même qualification déclarative, aucune promotion |
| En-tête de page | Validation / mesures labo réelles | Comparaison aux références déclarées ; accord statistique sans validation indépendante |
| Qualité 4–5 | Labo / gold standard | **Qualité déclarée 4–5**, aucune méthode déduite |
| Tableau | Mesuré / tier lab | Référence déclarée / qualité déclarée / qualification scientifique séparée |
| Indicateurs | Labo / Terrain / verdict de généralisation | Qualité déclarée 4–5 / 2–3 / accord descriptif |
| CSV | vlamax_measured_mmolLs / tier | Contrat **CSV V2** explicite, valeurs et groupes conservés, qualification inconnue sans preuve |

La reproduction initiale est rouge par assertion métier (`reference-red.txt`), pas par erreur d'import. Le rendu du composant réel est ensuite vert, avec sélection d'athlète via le composant Select existant. Le téléchargement réel de la page utilise le nouveau générateur CSV ; le test intercepte seulement le Blob local, sans données distantes.

## Préservation numérique

Les 15 références synthétiques couvrent les qualités 1 à 5, sprint seul, puissance seule et combinaison des deux. Leurs entrées calculées et l'objet AnchorReport complet sont **strictement identiques** à la capture antérieure : groupes, poids, prédictions, écarts, effectifs, RMSE, biais, MAE, proportions, verdict interne, notes et suggestions internes. Les populations retenues restent **6 dans lab, 6 dans field, 12 combinées**, 3 exclues.

Le fichier `vlamaxCapAnchorCalibration.ts` est inchangé octet par octet. Seule la vue qualifie les anciennes chaînes telles qu'« ancrages valides » ou les propositions d'ajustement : accord descriptif / amplitude interne à examiner, sans validation ou application automatique. Aucune formule, pondération, calibration, statistique numérique ou décision de prescription n'est modifiée.

Les preuves documentaires cohérentes restent distinguées des inconnues, mais ne sont jamais des mesures directes du flux glycolytique ou des validations individuelles. Une note « labo », un ID historique, un score 4–5 ou une valeur ne suffisent pas. Les métadonnées manquantes ne sont pas inventées.

## Pièces

- `render-before.txt` / `render-after-cohort.txt` : rendus textuels réels de la même cohorte et du même aperçu.
- `cohort-before.json` / `cohort-after.json` : entrées et rapport complets, strictement égaux.
- `export-v1.csv` / `export-v2-baseline.csv` : mêmes 15 lignes, contrat versionné ; `csv-compatibility.json` vérifie la correspondance.
- `export-v2.csv` : cas séparés de preuve cohérente et de source inconnue.
- `numeric-preservation.json` : fichiers protégés et archives inchangés.

Aucun fichier QA historique n'est recapturé. Les 37 profils restent une vérification distincte des nouvelles fixtures de cohorte.
