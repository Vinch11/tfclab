# V2.3 — contrat de qualification des références

Référence : PR #425, `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`. Branche expérimentale exclusivement. Aucun raccord Supabase réel ou DET, aucune migration ni modification d'équation.

## Quatre objets distincts

1. **Stockage** : snapshot, profil, test importé, `storageSource`/`storageDate`. Cela identifie un lieu/contexte de conservation, jamais une méthode physiologique.
2. **Calcul interne** : catégorie historique `test_labo`, `test_terrain`, `semaine_reference`, `estimation`, verrou, score de confiance et marge. Les noms et conventions numériques restent compatibles. `test_labo` n'est plus présenté comme une preuve scientifique.
3. **Provenance explicite** : sujet, quantité, valeur, unité, discipline, méthode structurée, date d'observation et source identifiable. Pour un protocole lactate : référence identifiable des mesures primaires et nature calculée/estimée obligatoires.
4. **Qualification** : `scientificQualification`, calculée par `qualifyReference`. Elle ne devient jamais une approbation individuelle.

## Données nécessaires

Les champs optionnels de l'enveloppe existante sont `subjectId`, `quantity`, `sourceRef`, `nature`, `methodKind`, `primaryMeasurementSourceRef`, `documentedUncertainty`. Valeur/unité/discipline/méthode/date existent déjà. Aucune colonne ni nouvelle table. Le format `TFCL_PHYSIOLOGY_V1` reste lisible ; aucun ancien enregistrement n'est complété automatiquement.

- Sujet, quantité `vlamax`, valeur finie, unité `mmol/L/s` et discipline doivent correspondre exactement au contexte sélectionné.
- Date calendaire explicite, méthode non vide, référence de source identifiable nécessaires. Une date de stockage n'est pas une date de test ; une source nommée simplement « labo » ne suffit pas.
- `methodKind` distingue protocole lactate sanguin, protocole terrain, modèle physiologique et déclaration coach. La nature doit être cohérente : calculée/estimée, estimée, calculée/estimée, déclarée respectivement.
- **La VLamax n'est jamais qualifiée comme mesure directe du flux glycolytique.** Le lactate sanguin est une mesure primaire ; une VLamax issue d'un protocole lactate est une dérivation ou estimation. La nature `measured` pour VLamax est refusée par ce contrat.

Une provenance manquante/incompatible produit `status: unknown`, `admissibility: not_established`, qualification visuelle inconnue. La valeur reste consultable. Une provenance documentaire cohérente produit `documented_context` / `documented_context_only` : cela décrit un contexte déclaré documenté, **pas une vérification indépendante du contenu de la source**.

`individualValidityEstablished` et `individualDoseApproved` valent toujours false. Une saisie, un mot « labo », un type LAB ou un score élevé ne peuvent les changer.

## Confiance et incertitude

Les 0,95 et ±0,02 internes sont conservés. Ils sont affichés comme **score/marge heuristiques internes**, sans probabilité de validité individuelle ni précision expérimentale démontrée. Les plages restent numériquement inchangées.

Une incertitude rapportée nécessite une borne finie/non négative, la bonne unité, un fondement explicite et une source identifiable. Elle est séparée dans `uncertainty`, avec `reported_not_independently_verified`. Sinon elle reste inconnue. Les bornes des tests sont des fixtures synthétiques de sérialisation, pas des observations expérimentales nouvelles.

## Historique, sérialisation et frontières

Les notes et objets historiques ne sont pas mutés. Les labels et flags en cache ne sont pas autoritaires : `requalifyReference`, `scientificReferenceLabel` et `qualifyScoreEnvelope` recalculent une vue à partir des éléments de provenance. Une autre valeur ou discipline invalide la qualification. L'ancienne note reste consultable comme note interne/historique, sans devenir preuve.

Le lecteur snapshot conserve les champs explicites ; les références VLamax brutes et effectives du contexte de plan sont requalifiées séparément. Même un appelant fournissant `scientificOrigin: direct_measurement` n'obtient pas ce statut pour VLamax. L'entrée raw originale reste intacte pour l'audit.

La qualification voyage avec le résultat effectif, le résultat V2, le ScoreEnvelope et les paramètres de trace existants. Le budget de 2 000 caractères des notes reste appliqué ; aucun dépassement tronqué, aucune provenance inventée pour contourner la limite.
