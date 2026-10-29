# Interface DET-ENGINE — audit en lecture seule

PR [#420](https://github.com/Vinch11/tfclab/pull/420), branche `experiment/det-engine`, examinée au SHA **`0f5079d93c03fb5d3c488ea11a3ba3253460068a`**. Aucun checkout/fichier/ref de cette branche modifié ; aucune intégration dans la branche V1.

## Attention aux versions

La baseline V1 `e31ffab…` est plus récente que la base de #420. [Comparaison des blobs](evidence/det-source-comparison.json) : références effectives, mapper V2, VLamax/TTE et doctrine/zones sont identiques ; diagnostic, préparation, builder et classement des limiteurs diffèrent. Les différences ne sont pas attribuées arbitrairement au travail DET : elles peuvent provenir de son point de branchement. Les 332 tests V1 ne sont donc **pas** présentés comme une réexécution de #420.

Sources DET prioritaires : [V20 physiologie](https://github.com/Vinch11/tfclab/blob/0f5079d93c03fb5d3c488ea11a3ba3253460068a/experimental/det-engine/v20-physio.ts), [tests](https://github.com/Vinch11/tfclab/blob/0f5079d93c03fb5d3c488ea11a3ba3253460068a/experimental/det-engine/v20-physio.test.ts), [fidélité physiologique](https://github.com/Vinch11/tfclab/blob/0f5079d93c03fb5d3c488ea11a3ba3253460068a/docs/det-engine/v20/PHYSIOLOGICAL_FIDELITY.md) et résultats archivés `docs/det-engine/v20/evidence/validation-2/build/physiology/results.json`. Les couches V21B/C ajoutent surtout qualification des sources/doses ; elles ne remplacent pas ces références physiologiques.

## Paramètres consommés

| Paramètre/contrat | Statut observé | Preuve et action minimale |
| --- | --- | --- |
| FTP W | Correctement transmise pour les cas V20 | `prepared.athleteData.ftp`, positivité/finition vérifiées ; 280→320 W fait passer la cible Z1 max 154→176 W, durée source inchangée. Pas de nouvelle formule FTP |
| Allure seuil course | Correctement convertie, provenance scientifique à préciser | Raw transmis sinon `estimateRunThresholdPaceSecPerKm(vma, runMLSS.effectivePct)` ; 3600/allure→km/h puis /3,6→m/s. Unités cohérentes à ce raccord |
| VLamax effective | Objet complet disponible dans `references` | V20 conserve valeur, source, confiance, plage et résultat V2 ; 0,2/0,9 modifie les limiteurs et le catalogue. Pas de preuve que l'incertitude module chaque dose |
| TTE effectif | Objet complet disponible ; pas certificat de capacité | Source/confiance conservées ; ne libère ni durée de séance ni adaptation future. Les tests DET refusent qu'un avis coach lève un plafond individuel |
| VO₂/VMA | Disponibles dans contexte, usage indirect | VO₂ alimente diagnostic ; VMA peut ancrer le repli seuil course. Le résolveur V20 ne crée pas une cible VO₂ autonome |
| CSS | Disponible dans `athleteData`, non utilisée par ce résolveur de prescription | Branche V20 cible bike/run ; sport nage→référence non résolue. Ce constat limité n'est pas « natation absente de tout DET » |
| CP/W′/qualité | Disponibles en diagnostic/limiteurs, pas exposés comme ancres V20 autonomes | Aucun besoin démontré d'inventer une cible W′ pour les deux recettes de récupération étudiées |
| FatMax | Disponible selon entrées et modèle, non utilisée comme ancre directe V20 | Pas de correction de formule requise par ce constat |
| Score économie / CE | **F4 également présent dans le code diagnostic au SHA DET** | `input.runEconomyScore` arrive aux deux appels prédicteur/cross-validation. Besoin d'un coût O₂ distinct ; aucun score→CE automatique |
| Confiance VO₂/FTP/seuil et dates par champ | Absentes ou incomplètes dans les références aplaties | `runMLSS` garde prédiction/trace, mais une allure brute n'est pas identifiée comme mesure/estimation/déclaration. Date du snapshot ne suffit pas pour chaque valeur consolidée |
| Plages d'ancre→cible de séance | Incertitude disponible mais non propagée quantitativement | La plage de domaine Z1 n'est pas l'intervalle d'erreur FTP/MLSS. Conserver l'incertitude et afficher son absence ; aucune nouvelle propagation scientifique non étayée |
| Limiteurs/leviers | Limiteurs consommés, causalité des doses encore non établie | DET archive ce constat et garde `prescriptionIntent: not_verified`. Disponibilité de levier ≠ dose vérifiée |

## Corrections de contrat réellement nécessaires

1. **Séparer `runEconomyScore` et coût `runningEconomyCostMlKgKm`.** Le coût est optionnel et explicitement en ml O₂/kg/km. Absent→pas de prédiction Modèle C ; conserver le proxy seuil/VMA s'il est disponible. Correction candidate F4 uniquement, pas appliquée à #420.
2. **Garder provenance de stockage et provenance scientifique séparées pour les ancres.** Pour FTP/allure/CSS/VO₂ : valeur, unité, discipline, date du test, méthode, `direct_measurement | field_estimate | model_inference | coach_declared | unknown`, puis `storageSource`/snapshot ID. Ne déduire `direct_measurement` ni de `snapshot` ni de `lab_import` seul. F2/F3 illustrent le besoin.
3. **Ne pas perdre les incertitudes existantes.** Transmettre les objets VLa/TTE déjà disponibles, la source du seuil (proxy/prédit), confiance/marge connues et avertissements utiles ; inconnues explicites pour les autres. Ne pas transformer un RMSE global en marge individuelle certifiée.

Pas de nouvel algorithme de prescription, de nouveau calculateur, d'obligation de CP/CSS/FatMax dans une recette qui ne les consomme pas, ni de fusion proposée. Une répétition future du contrôle V20, avec son SHA propre et le contrat corrigé, est nécessaire avant de revendiquer sa non-régression ; elle n'a pas été lancée dans V1.
