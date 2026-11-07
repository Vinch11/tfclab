# CSV cohorte CAP — contrat V2

**Rupture de contrat explicite** : nom de fichier `vlamax_cap_anchor_cohort_v2_<date>.csv` et colonne `schema_version = tfclab.vlamax-cap-cohort.csv.v2`. Les lecteurs V1 doivent être adaptés ; aucun basculement silencieux ni migration des anciens fichiers.

| Colonne V1 | Colonne V2 / sémantique |
| --- | --- |
| date | record_date_declared : date conservée du dossier, pas une preuve de date d'observation scientifique |
| tier | legacy_internal_quality_tier_NOT_scientific_method : valeur interne **lab/field/rejected conservée**, sans méthode scientifique déduite |
| protocol_quality | protocol_quality_declared : score numérique déclaré inchangé |
| vlamax_measured_mmolLs | vlamax_reference_declared_mmolLs : même nombre, unité mmol/L/s ; aucune mesure directe de VLamax revendiquée |
| athlete_id, athlete_name | Identiques |
| sprint15s_distance_m, running_power_max_w, vma_kmh, pace_threshold_sec_per_km | Nombres/champs vides identiques |
| predicted_vlamax, delta_vlamax | Nombres/champs vides identiques ; aucune formule ou arrondi modifié |
| notes | Texte brut préservé avec guillemets CSV doublés, y compris virgules et retours à la ligne ; V1 remplaçait les guillemets et aplatissait les lignes. Aucun historique stocké n'est réécrit. |

Les nouvelles colonnes `quality_group_declared` décrivent les groupes « Qualité déclarée 4–5 », « Qualité déclarée 2–3 » et « Qualité déclarée < 2 (exclue) ». Elles conservent exactement les populations de calcul historiques et leurs poids ; elles ne sont pas des méthodes physiologiques.

`scientific_qualification`, `reference_nature`, `scientific_method`, `scientific_method_kind`, `observation_date`, `source_ref` et `primary_measurement_source_ref` restent inconnus/vides sans preuve cohérente. Le simple score, les notes libres, l'ID ou la présence d'un scalar n'en renseignent aucun. Une provenance documentaire cohérente ne devient pas une validation indépendante : `individual_validity_established` et `individual_dose_approved` sont toujours false.

`scientific_uncertainty_status` vaut unknown ou reported_not_independently_verified. `reported_scientific_uncertainty_json`, lorsqu'il existe, conserve la borne rapportée, son unité, sa base et sa source ; il ne désigne pas une précision expérimentale démontrée. Le RMSE de cohorte reste une statistique descriptive distincte d'une incertitude individuelle.

Convention de lecture facultative, réutilisant le contrat de provenance existant : `raw_values.physiologicalEvidence.vlamax` peut contenir une ReferenceEvidence explicite. Le sujet, la quantité, la discipline run, la valeur, l'unité, la méthode, la date d'observation et la source doivent concorder avec la référence. Une dérivation lactate exige sa source primaire. La date doit être compatible avec la date déclarée du dossier ; aucun remplacement par une date de stockage. Une preuve d'un autre sujet, d'une autre valeur ou d'une autre observation reste inconnue au tableau comme à l'export. Le formulaire courant ne fabrique pas cette preuve à partir de ses champs ou de ses notes.

L'export V2 ajoute de l'information de qualification ; il ne modifie aucun groupe statistique, aucune donnée stockée, aucun modèle et aucune prescription. L'ancien nom interne `vlamaxRunMeasured` et le tier `lab` sont conservés dans le moteur et l'historique uniquement pour compatibilité.

La comparaison des 15 lignes synthétiques au CSV V1 extrait du SHA immuable est dans `evidence/csv-compatibility.json`. Tous les champs numériques et groupes mappés sont identiques. Le nouveau contrat nécessite un lecteur CSV qui respecte les champs cités et les retours à la ligne dans les notes.
