## Objectif

Garantir qu'à chaque endroit qui consomme « la VLamax » de l'athlète, c'est la valeur **adaptée à l'objectif** qui est utilisée :
- Course (5k/10k/semi/marathon) → `vlamax_run`
- Trail (court/long/ultra) → `vlamax_run`
- Vélo / cyclisme → `vlamax` (vélo)
- Triathlon (IM, 70.3) → règle : `vlamax` (vélo) reste la donnée pivot pour la simu vélo, mais le scoring « cap-spécifique » (économie, MLSS run, drift) utilise `vlamax_run`. La carte unifiée et le résumé global utilisent **les deux**, jamais un mélange.

Aujourd'hui, plusieurs consommateurs lisent toujours `snapshot.vlamax` (vélo) même pour un coureur pur, ce qui produit des badges, scores et conseils incohérents.

## Travaux

### 1. Helper unique (source de vérité)

Créer `src/lib/vlamaxResolver.ts` :

- `resolveVlamaxForGoal(snapshot, athlete)` →
  ```ts
  { value: number | null; source: "run" | "bike"; sport: CanonicalSport; reason: string }
  ```
  Utilise `resolveSportMain` + fallback (si run mais `vlamax_run` manque → null + `reason: "missing_vlamax_run"`).
- `resolveVlamaxBadgeKind(...)` : mappe `source` vers `"cap" | "bike"` pour les bandeaux/cibles.
- Politique « Données insuffisantes » respectée : pas de fallback silencieux vélo → run.
- Tests unitaires sur les 4 cas (run / trail / bike / tri) + 2 cas dégradés (sport_main incohérent, valeur absente).

### 2. Audit + migration des consommateurs

Remplacer toute lecture directe `snapshot.vlamax` par `resolveVlamaxForGoal` dans les fichiers où la valeur sert à un usage générique « VLamax athlète » :

- Cartes & UI dashboard
  - `VLamaxUnifiedCard` (déjà partiellement fait, vérifier l'header global)
  - `DashboardRecommendationsCard`, `DashboardGauges`, `DecisionReliabilityCard`, `LactatePredictionCurve`, `LactateCorrespondenceCard`, `BeforeAfterComparisonCard`, `LimiterHierarchyEditor`, `DataCompletionGuide`, `AthleteRefsPanel` (badge "VLamax")
- Moteurs scientifiques
  - `engines/diagnostic/computeDiagnostic.ts` (limiteurs)
  - `engines/decision/computeDecision.ts`
  - `engines/plan/planConfigBuilder.ts` + `planValidator.ts`
  - `lib/compassScoring.ts` / `compassScoringCAP.ts`
  - `lib/scoreEnvelope.ts`, `lib/runInjuryRisk.ts`, `lib/runningEconomy.ts`, `lib/energyDrift.ts`, `lib/annotationEngine.ts`
- Exports & rapports
  - `ExportTools.tsx`, `staffReport.ts`, `staffBriefing.ts`, `PDFPreviewPanel.tsx`
  - Mini-rapport (`lib/miniReport/computeMiniProfile.ts`)
- Hooks IA / contexte
  - `useAITrainingPlan`, `useAICoaching`, `useAssistantContext`, `useDecisionReliability`, `useRunMLSSDriftDetection`
- Race Sim
  - `pages/RaceSimulationPage.tsx` : pour un objectif **course/trail**, n'utilise plus la VLamax vélo dans la simu run.

### 3. Endroits qui doivent rester sur la VLamax vélo

Documenter explicitement (commentaire `// raw bike VLamax — do not route via resolver`) :
- `VLamaxBikeV2EnhancedCard`, `VLamaxDiagnosticPage`
- `lib/v2/vlamaxBikeV2Enhanced` et calibrations bike (`calibration_evidence` source vélo)
- Onglet Bike de `VLamaxUnifiedCard`
- Composants spécifiques run (`VLamaxRunExplainedCard`, page Running) restent sur `vlamax_run`.

### 4. Garde-fous

- Lint maison (regex + commentaire) : tout nouveau `snapshot.vlamax` hors fichiers whitelistés ⇒ doit passer par le resolver.
- Ajout d'un warn dev `[vlamax-resolver] sport=run mais vlamax_run manquant — affichage "Données insuffisantes"`.
- Mémoire projet mise à jour (`mem://logic/vlamax-resolver-uniform-by-goal`).

### 5. Vérification

- Tests : `engines/diagnostic`, `engines/decision`, `planValidator`, mini-rapport.
- QA visuel : Dashboard d'un athlète **Marathon** (Cath) → toutes les cartes affichent `vlamax_run`, plus aucune référence accidentelle à la VLamax vélo. Idem athlète **Ironman** (mix) et **vélo pur**.

## Points à confirmer

1. **Triathlon** : on garde la règle « bike pour la simu vélo, run pour la simu run, et la carte globale affiche les deux côte à côte » ? Ou on impose une seule VLamax « pivot » (vélo) ?
2. **Trail court (≤30 km)** vs **trail long/ultra** : même politique (toujours `vlamax_run`) ou nuance pour l'ultra (où la VLamax est presque non-discriminante) ?
3. **Manque de `vlamax_run` pour un coureur** : on affiche « Données insuffisantes » partout (politique actuelle) ou on accepte un fallback estimé via le moteur V2 run ?
