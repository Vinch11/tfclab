# Du test brut au profil — vérification V1

## Chaîne et points contrôlés

`TestLibrary / Profil Express / import labo → payload snapshot → getEffectiveRefs + mapSnapshotToV2 → effectifs → computeDiagnostic → prepareTrainingPlanContext → athleteData / planConfig / trace`.

| Étape | Preuve existante réutilisée / contrôle V1 | Conclusion et limite |
| --- | --- | --- |
| Brut terrain→valeur | Formules partagées et tests Profil Express ; V1 appelle les vrais protocoles FTP, CSS, Cooper, VMA | P20=300 W→285 W ; 400/200 en 440/220 s→110 s/100 m ; Cooper 3000 m→55,8 ml/kg/min ; VMA=18 km/h conservée |
| Valeur→références effectives | `effectiveRefs.ts` : actif de l'athlète, sinon dernier snapshot de cet athlète, puis profil par champ, puis null | Priorité et absence de défaut inventé confirmées. **F1** : bornes appliquées au snapshot, pas au profil ; numérique invalide atteint FTP/kg |
| Snapshot→VLamax | `mapSnapshotToV2.ts`, tests `vlamaxEffectif`, `cpVlamaxContamination`, convergence CAP et verrou labo | Champs puissance/course/source/sprint transmis ; pas de contamination vélo/CAP sur les cas protégés. **F3** est en amont, dans le mapper PDF |
| Effectifs→diagnostic | Tests existants, puis cas V1 avec `vlamaxEffectifPrecomputed` | Objet complet réutilisé, valeur labo synthétique 0,42 conservée, verrou et confiance 0,95, marge ±0,02 et plage conservées |
| Diagnostic→planification | Tests `planConfigBuilder`, `prepareTrainingPlanContext`, transmission globale ; V1 traverse les fonctions réelles | FTP/CSS/VMA/VO₂ et valeurs VLa/TTE identiques ; trace conserve confiance globale et avertissements. Les objets de valeur aplatis ne transportent pas toutes les incertitudes |
| Économie→MLSS course | Nouveau contrôle d'unités sur fixture QA existante | **F4** : score/100 lu comme ml O₂/kg/km. Le calcul du prédicteur avec un vrai coût reste cohérent ; corriger le contrat d'entrée, pas sa formule |
| Consolidation campagne | Tests existants `testingWeekSnapshotMerge`, sonde V1 de deux snapshots | Dernière valeur par champ conservée ; aperçu possède `fieldOrigins`. Payload conserve une liste source/date dans les notes mais pas l'association structurée champ→date/source |

## Artefacts exécutables

- [Test de chaîne](../../../experimental/physiology-validation/v1/pipeline.test.ts) et [sortie brut→plan](evidence/raw-to-plan.json).
- [Import course corrigé expérimentalement→plan](evidence/candidate-run-lab-to-plan.json) : une usine d'extraction vide existante sert de fixture, aucune donnée PDF réelle.
- [Consolidation](evidence/consolidation-provenance.json) : FTP datée du 10/10 reste 280 W, VMA du 20/10 reste 18 ; date du nouveau snapshot 29/10. Les dates originales restent lisibles dans les notes.
- [Économie/MLSS avant-après](evidence/economy-contract.json).

Le test brut→plan assemble explicitement le snapshot à partir des sorties de bibliothèque : il vérifie les fonctions et leur contrat, **pas** une sauvegarde React/Supabase de bout en bout. Les imports labo traversent le mapper candidat, ce qui ne prouve pas que le mapper de production est corrigé. Pas d'écriture base, de test d'API Nolio ou de parcours athlète réel.

## Fraîcheur et provenance

`getEffectiveSnapshot` respecte un snapshot actif ancien même si un plus récent existe : choix explicite, pas défaut démontré. `vlamaxV2Engine` peut pénaliser l'âge des données ; `planningSnapshotLoad.ts` filtre la charge selon la date du bilan. La date synthétique de l'adaptateur diagnostic (`new Date`) ne remplace pas l'historique lorsqu'un effectif précalculé est fourni, mais les appelants sans cet historique ne transmettent pas tous l'âge original de chaque mesure.

La consolidation redonne une date courante à un ensemble de valeurs plus anciennes. Une liste narrative de sources ne permet pas aux consommateurs numériques de calculer l'âge par paramètre. C'est une limite de traçabilité identifiée, sans nouvelle règle de péremption inventée. Reprise : conserver un manifeste par champ au prochain contrat, pas migrer la base dans V1.

`usePlanSnapshotSync.ts` surveille FTP, VLamax vélo, VO₂ et VMA avec seuils déclarés ; CSS, VLamax course et TTE ne sont pas dans cette liste. Lecture seule : V1 ne conclut pas qu'un plan utilisateur devient faux automatiquement et ne lance aucune régénération.
