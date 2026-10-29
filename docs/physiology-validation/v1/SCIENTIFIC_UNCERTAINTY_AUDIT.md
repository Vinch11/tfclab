# Audit de l'incertitude scientifique

## Distinctions conservées

| Nature de preuve | Exemple | Ce qu'il ne faut pas lui attribuer |
| --- | --- | --- |
| Mesure directe explicitement déclarée | VLamax lactate avec source `lab` ; VO₂ mesurée si protocole connu | Le seul stockage dans un snapshot ou import PDF ne prouve pas la mesure directe de chaque champ |
| Estimation terrain | FTP 20 min, Cooper, sprint 15 s, VMA piste, CSS | Même précision qu'analyse gazeuse/lactate, ou validité individuelle certaine |
| Inférence de modèle | MLSS Mader, Modèle C, FatMax, substrats, proxy durabilité | Nouvelle observation indépendante, adaptation réellement obtenue ou tolérance à la dose |
| Déclaration coach | Valeur manuelle, appréciation de résistance, ordre de limiteurs | Mesure objective ou approbation physiologique automatique |
| Provenance de stockage | `snapshot`, `profile`, `lab_import`, `profil_express` | Statut scientifique universel « mesuré » |

## Ce qui se transmet et ce qui se réduit

1. `VLamaxEffectif` conserve `rawValue`, `value`, `confidence`, `errorMargin`, `range`, date/source et résultat V2. Le diagnostic accepte cet objet précalculé tel quel : sonde labo V1 0,42, confiance 0,95, ±0,02 confirmée.
2. `TTEEffectif` conserve une source (`observed`, `records`, `estimated`, `unknown`), une confiance et un libellé. Il n'expose pas la même plage numérique que VLamax. Un proxy chronos demeure estimé.
3. `computeDiagnostic.meta.confidenceGlobal` prend le minimum VLa/TTE/fatigue/limiteur. Le score du limiteur dépend de complétude ; les nombres ne sont pas des probabilités calibrées d'exactitude ou de succès.
4. `TrainingPlanPhysiologicalTrace` transporte confiance globale, complétude et avertissements génériques. `PlanAthleteData` aplatit les valeurs VLa/TTE et omet leurs plages/sources détaillées. Le diagnostic complet reste disponible localement ; cela n'implique pas que chaque consommateur du payload final lit ces informations.
5. DET V20 conserve les objets effectifs complets dans `references` et ses artefacts, mais calcule les cibles centrales depuis FTP/allure. Ses bornes de domaine sont des plages d'intensité de séance, pas une propagation de l'incertitude de l'ancre.

## Marges réellement documentées

[Le moteur VLamax V2](../../../src/lib/v2/vlamaxV2Engine.ts) utilise marges et confiance par source, facteurs de concordance, stabilité et âge ; seuls les résultats estimés sont lissés. C'est une convention de fiabilité logicielle explicite. Plusieurs indices issus des mêmes FTP/VO₂/temps ne deviennent pas indépendants parce qu'ils concordent.

[L'intervalle MLSS](../../../src/lib/v2/inscydPoffe2024Sensitivity.ts) utilise les sensibilités publiées Poffé, une somme quadratique et un plancher de 3 %. Sa mise à l'échelle `(2−confidence)` et l'indépendance des contributions sont des choix du logiciel. Pour 280 W, la sonde donne ±26 W (9,1 %) avec confidences 1/1 et ±37 W (13,2 %) à 0,5/0,5 : [résultat](evidence/mlss-uncertainty.json). Ce ne sont pas des limites d'accord TFCL mesurées, ni un IC à 95 %. Le libellé `quality: lab` décrit ici les entrées de confiance, pas une nouvelle expérimentation.

FatMax expose une plage dépendant de confiance et sépare travail/physiologie. Les références de clusters p25/p75 ou p10/p90 sont des distributions de population : elles ne remplacent pas l'intervalle d'erreur d'un individu. RMSE interne, erreur typique, marge heuristique et dispersion de population restent distincts.

## Incertitudes matérielles à conserver au contrat

Le graphique `SnapshotEvolutionChart.tsx` reconstruit ses bandes VLamax depuis la confiance (0,05×(1−confiance), ou 0,03), avec ses bornes d'affichage, plutôt que de lire la plage canonique de l'effectif. Ces bandes illustratives ne doivent pas être présentées comme un intervalle expérimental ou comme la même marge que celle du diagnostic. Le rapport d'audit scientifique dispose par ailleurs des traces et plages de calibration ; ce chemin Cloud n'a pas été exécuté.

- F2 : libellé « Mesuré (snapshot) » reproduit sur une provenance de stockage, corrigé seulement dans le candidat.
- F3 : import PDF perd discipline et source VLamax ; F4 : score économie et coût O₂ confondus. Les deux peuvent donner une apparence de cohérence supérieure à la preuve d'entrée.
- `runMLSS.observedPct` vient du ratio vitesse seuil/VMA. Le nom `observed` oppose ce proxy à la prédiction du Modèle C : il ne signifie pas MLSS sanguin confirmé ni équivalence exacte %vVO₂/%VO₂.
- Bibliographie indépendante présente, mais résultats TFCL hors échantillon non démontrés par cette session. N=44, N=15 et erreur historique Modèle C restent à relier à leurs archives de calibration.
- Consolidation : dates par champ dans l'aperçu, moins exploitables après stockage ; profil manuel sans âge par paramètre ; aucun seuil de péremption nouveau fixé ici.

Proposition minimale : transporter valeur, unité, discipline, nature scientifique, méthode, date du test, source de stockage et marge/confiance **quand disponibles**, sinon `unknown`. Ne jamais remplir ces champs par une précision inventée. Voir [contrat DET](DET_ENGINE_INTERFACE_AUDIT.md).
