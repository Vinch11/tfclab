# P2 — Préparation physiologique partagée du Pilot Cockpit

## Cartographie avant

| Étape | Parcours coach | Pilot Cockpit | Écart constaté |
|---|---|---|---|
| Données athlète | `AITrainingPlanPage.tsx::buildDiagnosticForAthlete` fusionne athlète, snapshot, tests, chronos et check-in | `syntheticProfiles.ts` fournit `athleteData` et un `planConfig` déjà rempli | Le cockpit ne construisait aucun `DiagnosticInput` |
| Diagnostic | `computeDiagnostic(diagnosticInput)` | absent | Aucun limiteur calculé pour le pilote |
| Priorité et confiance | `diagnostic.limiter.gapAnalysis` et `diagnostic.meta` | absentes du payload | Le niveau débutant était présent, mais pas la causalité physiologique |
| Décision | `computeDecision()` existait dans le moteur et dans des écrans d'aide à la décision | absent | Ni le coach générateur ni le cockpit n'appelaient le Decision Engine dans ce chemin |
| Configuration | `buildPlanConfigFromDiagnostic()` construit limiteurs, leviers issus du diagnostic, prohibitions et risques | profil synthétique transmis directement | Deux préparations différentes |
| Catalogue | `useAITrainingPlan.ts` consomme limiteurs, prohibitions, risque, niveau et contexte | même générateur, mais champs physiologiques généralement absents | Parité technique sans parité physiologique |
| Génération | `useAITrainingPlan.generatePlan()` | même fonction | Point de convergence trop tardif |
| Réparations | réparations serveur puis `runReconciler` client | mêmes réparations | Les protections de la PR #383 étaient présentes mais recevaient un contexte cockpit plus pauvre |
| Validation | `validatePlan` reçoit limiteurs, prohibitions et risque dans le parcours coach | le cockpit passait `undefined` pour ces champs | La QA ne validait pas le contexte qu'elle prétendait simuler |

## Cartographie après

Les deux chemins passent par `src/engines/plan/prepareTrainingPlanContext.ts::prepareTrainingPlanContext`.

```text
DiagnosticInput ou AthleteDiagnostic
  → computeDiagnostic (si l'entrée n'est pas déjà calculée)
  → computeDecision
  → buildPlanConfigFromDiagnostic
  → raccordement des leviers et prohibitions de la décision
  → PlanConfig + TrainingPlanPhysiologicalTrace
  → useAITrainingPlan
  → buildWorkoutCatalog
  → edge ai-training-plan
  → réparations serveur/client PR #383
  → validatePlan + checks B1-B14
```

- Le coach appelle cette préparation depuis `AITrainingPlanPage.tsx::buildConfigFromDiag` avec son diagnostic complet et conserve l'override d'ordre des limiteurs.
- Le cockpit adapte le profil fixe via `preparePilotTrainingPlanContext.ts`, puis appelle exactement la même préparation.
- Le cockpit transmet le `planConfig` préparé au générateur et réutilise ses limiteurs, prohibitions et risques dans `validatePlan`.

## Éléments réellement connectés

| Élément | Origine | Transmission | Consommation prouvée par le code |
|---|---|---|---|
| Limiteurs classés | `diagnostic.limiter.gapAnalysis` | `identifiedLimitersRaw` et bloc détaillé | score et couverture du catalogue, prompt de chaque chunk, réconciliateur serveur |
| Confiance diagnostic | `diagnostic.meta.confidenceGlobal` | `physiologicalTrace` | affichage/export QA ; elle ne modifie pas encore le score du catalogue |
| Leviers | `decision.strategy.levers` | `activeLevers` et `strategyContext.levers` | prompt structuré du générateur |
| Adaptations recherchées | `lever.prescription` | `strategyContext.levers[].adaptations` | prompt structuré du générateur |
| Prohibitions | builder historique + `decision.strategy.prohibitions` | `planConfig.prohibitions` | filtre déterministe du catalogue et prompt prioritaire |
| Risque blessure | `diagnostic.injuryRisk` | `planConfig.injuryRisk` | malus catalogue, garde-fous edge et validation |
| Action et focus stratégiques | `decision.strategy` | `strategyContext` | prompt structuré du générateur |
| Type de semaine stratégique | `decision.strategy.weekType` | `strategyContext.recommendedWeekType` | indication dans le prompt seulement ; les règles de phase et de décharge restent autoritaires |
| Séance finale → levier | plan final | aucune attribution structurée | **non vérifié** ; aucune réussite artificielle n'est affichée |

## B-5K-BEGINNER

Le profil existant reste la source des valeurs : femme de 42 ans, premier 5 km, 12 semaines, trois séances de course, une séance de renforcement, trois heures par semaine, VO2max 34, VMA 9,5 km/h, FCmax 178 et terrain plat. L'adaptateur ne fixe aucun limiteur. Il convertit les valeurs existantes en `DiagnosticInput`, marque la VLamax synthétique comme estimation et laisse `computeDiagnostic()` établir le classement, la confiance et les incertitudes.

## Limites restantes

- Le cockpit reste un déclencheur payant lorsqu'un humain clique sur « Lancer ». Les tests de cette PR n'appellent jamais Gemini.
- `activeLevers` et `strategyContext` guident le modèle par le prompt. Ils ne sont pas encore un filtre déterministe de chaque fiche du catalogue.
- La trace prouve que les données atteignent des consommateurs identifiés dans le code. Elle ne prouve pas qu'un modèle génératif suit chaque instruction.
- Le plan final ne porte pas encore, séance par séance, un identifiant de limiteur et de levier. `prescriptionIntent` reste donc `not_verified`.
- Cette PR établit la parité de préparation. Elle ne démontre pas une amélioration de la qualité sportive du plan, qui exige une évaluation de bout en bout séparée.
