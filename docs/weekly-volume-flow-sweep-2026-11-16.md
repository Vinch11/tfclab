# Vérification du minimum hebdomadaire

## Règle
Un minimum d'endurance ne peut pas exiger davantage que le plafond réellement autorisé par la progression ou la récupération. Le renforcement reste hors budget. Une cible nominale reste visible ; un vrai déficit atteignable reste refusé et les petits écarts restent des avertissements.

## Parcours lus et résultat
| Parcours | Code lu | Résultat |
|---|---|---|
| Prévalidation et écran de prévalidation | `planPrevalidation`, `prevalidateTrainingPlan`, `PlanPrevalidationPanel` | Contrôle des planchers structurels/catalogue contre le plafond, pas de minimum horaire impossible imposé. |
| Configuration et consignes IA | `sessionSizingMatrix`, `prepareGenerationContracts`, deux `promptHelpers` | Consigne « DOIT atteindre le minimum » corrigée : minimum nominal subordonné au plafond réel. Contrat nominal non réécrit. |
| IA JSON, texte, assemblage des fenêtres | `useAITrainingPlan` | Réparation avant validation commune déjà conforme ; assemblage corrigé pour refuser aussi les vrais déficits atteignables. Refus de prévalidation ne vide plus le plan courant. |
| Génération multi-athlètes | `AITrainingPlanPage` | Réparation puis contrôle commun, conforme. |
| Régénération d'une semaine | `AITrainingPlanPage` | Contrôle sur plan complet ; vrai déficit désormais refusé avec raison précise. Seule la semaine demandée peut être raccourcie. |
| Régénération d'une période / futures et adaptations | `useAITrainingPlan`, `usePlanAdaptation` | Contrôle commun ; refus des vrais déficits ajouté aux adaptations. Modifications coach non raccourcies automatiquement. |
| Ouverture, modification, affichage et sauvegardes | `AITrainingPlanPage`, `AIPlanViewer`, `useCloudData`, `planDeliverySafety`, `validateWeeklyQuotas`, `finalValidation` | Minima recalculés en lecture seule ; sauvegardes reprennent le contrôle commun. Historique non réécrit. |
| QA / cockpit | `useQARunner`, `usePilotCockpit`, `checks`, `finalValidation`, laboratoire `planningMatrix`/`analyzePlan` | Réutilisent génération/quotas ; seuils de scénario restent descriptifs, pas une nouvelle règle de refus horaire. |
| DET séparé | `DetCoachPanel`, client et archive worker `public/__det/v1`, `controlledPrescription`, `controlledPlan`, `controlledPlanHandler` | Sortie du worker contrôlée par la règle commune. Prescription contrôlée utilise plafonds et planchers de séance, pas le minimum horaire nominal. Aucune activation ni archive worker modifiée. |
| PDF paysage/portrait/compact | `AIPlanViewer`, `aiPlanPDFExport` | Rendu du plan courant, ne prescrit ni n'impose de minimum ; aucune correction de volume appliquée à l'export. |
| Nolio séance/semaine/plan | `AIPlanViewer`, `NolioSendPlanCard`, `nolio-send-plan`, `planExportSafety` | Client vérifie le plan entier avec le minimum atteignable. Serveur contrôle calendrier/reprise marathon, pas le minimum horaire : pas de second minimum contradictoire. |
| Cycles Nolio | `NolioCyclesPanel`, `nolio-v2-oauth` et `cycles` | Contrôle client commun ; serveur crée des bannières, sans budget horaire. Collision/confirmation/relecture préservées. |
| DET Nolio archive/préparation/envoi/vérification | `det-nolio-export`, `planExportSafety` | Contrôle daté avant nouvelles écritures ; vérification des reçus confirmés reste exclue des nouveaux refus. Pas de minimum horaire serveur. |
| Génération des structures Nolio | `nolio-batch-generate` | Structure de séances isolées ; pas de budget hebdomadaire. |
| Tâches de charge quotidienne et import manuel | `nolio-training-load-daily`, `nolio-training-load` | Écrivent les charges observées, ne génèrent pas de plan et n'imposent pas de minimum. |
| Fonctions de base | Recherche migrations, `_trigger_nolio_daily_cron`, fonctions opérations/grants DET | Aucun contrôle de minimum horaire trouvé ; appels cron, autorisations et reçus inchangés. Définitions actuellement installées non relues. |

## Vérification et limites
- 139 tests passent, dont règles S5 915/950/1030, déficit réel, récupération, réparation, livraison sans mutation, affichage/sauvegarde/export, prévalidation sans requête et prescription contrôlée.
- Sept contextes objectif (5 km, 10 km, semi, marathon, trail, 70.3, Ironman) testent la même règle de livraison sur fragments synthétiques ; cela ne valide pas sept plans sportifs complets.
- Deux générateurs déployés avec succès ; compilation OK. Contrôle GET connecté des versions après actualisation de l'aperçu.
- Aucun nouveau plan complet généré, adaptation réelle sauvegardée, envoi Nolio, impression native ni définition live de fonction de base vérifiée. Charge précédente du plan refusé d'Emanuela indisponible ; la capture seule ne prouve pas son plafond exact.
- Aucun plan stocké, reçu envoyé, permission, réglage ou exemple existant modifié.