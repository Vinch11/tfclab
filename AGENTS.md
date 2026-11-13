# Architecture rules

- Staff factual evidence uses `coachingCompass/staffEvidence` with athlete-scoped stored inputs, raw tests and critical efforts; missing sensor/protocol metadata stays unknown and records never imply certified measurements. Why: report models must remain separate from the observations supporting them.

- Reports consume `coachingCompass/reportPresentation` for displayed values, targets, sources and sport references; never infer alternative report targets or relabel bike FatMax as running pace. Why: PDF and screen must present the same diagnostic projection without changing plan contracts.

- Use `diagnosticMetricPresentation` to classify W′, TTE, durability and FatMax as unscored dashboard references without mutating diagnostic outputs. Why: a modeled threshold duration or lipid zone cannot certify long-event readiness.

- Store Nolio running-power CP/W′ under `critical_metrics.runningPower`, never under running CS/D′ or cycling CP/W′; records remain estimates and cannot feed plan prescriptions. Why: sensor-derived running watts are not distances or interchangeable cycling watts.

- Compass presentation is a read-only projection of diagnostic outputs; TTE labels, provenance and missing-data states must never mutate limiter rankings or IA/DET contracts. Why: clearer displays must not silently change future plans.
- Resolve display-only sport and critical references through `coachingCompass/sportPresentation`; never radar-score W′/D′ or convert cycling thresholds into running thresholds. Why: complementary sensor-specific reserves and sport-specific measures must not imply cross-sport weaknesses.

- Export AI plan cycles through Nolio v2 as one non-overlapping banner per existing phase, with parallel ranked workstreams in its text; resolve the stored athlete link server-side, preview before confirmation, preserve foreign/edited cycles and verify created cycles by readback. Why: calendar phases must not duplicate sessions, overwrite coach work or target a guessed athlete.

- Preserve VO2max and VMA as distinct ranked coach priorities in plan coverage, explicitly sharing their aerobic stimulus without duplicating session totals; latest page order overrides a restored coach payload. Why: family deduplication and stale policies hid the coach's L2.
- Catalogue duration deviations are warnings in final plan validation, while incompatible sport, phase, intensity and structure retain their content checks. Why: a volume adjustment must not be treated as a fundamental goal/content conflict.

- Critical metrics (CP/W′, CS/D′) are stored per snapshot with status estimate|confirmed, separate from the legacy CP/VLamax model; only coach-confirmed recent values produce plan interval proposals, applied only when the coach accepts each one. Why: record fits must not silently become measurements or rewrite sessions.

- Explicit strength frequency and double-day limits are carried in weekly quota contracts shared by layout, prevalidation and final validation; run-cycle maintenance adds only selected sports without removing run targets. Why: prompt-only choices contradicted imposed calendars.
- Audited demanding-family definitions and ID safety policies live in `supabase/functions/_shared`, re-exported by the client and checked independently by JSON catalogue contracts. Why: coach approval must not waive verified level, hours or permanent exclusions.
- Guided schedule overrides use the selected plan start date and update the A race contract on generation and regeneration; limiter-only stored policies cannot override visible frequency. Why: stale dates and saved frequencies silently changed plans.
- Terrain eligibility uses explicit catalogue metadata and the prescribed day in shared checks, with terrain carried to final validation; B/C races remain tune-ups rather than independent peaks. Why: available terrain and race priorities must not remain prompt-only preferences.

- Nolio v2 period imports prefill only empty observed snapshot fields after coach selection; never infer thresholds or confirmed protocols from records. Why: best efforts are not laboratory measurements.
- Nolio test review distinguishes quick records from coach-confirmed protocols; the period finder lists every candidate with a confidence badge (test found / to check / information) and fills only coach-ticked, empty fields; FTP may only be proposed "to check" from a 20-min test lap, and VLamax or CSS are never written. Why: records cannot certify a test, but hiding uncertain values made the tool unusable.
- Nolio multi-sport reads query each selected variant independently and retain its base sport; suspend prefill if any response is incomplete or fails. Why: indoor/outdoor variants must aggregate without mixing running and cycling measurements or hiding missing reads.
- A project-level Nolio personal token is usable only when the verified app email matches the Nolio owner profile email; tokens and owner identity stay server-side. Why: authentication alone does not authorize another coach to use a shared key.

- Keep controlled prescription gated until complete sport-specific and race-stage contracts pass validation; never activate it by globally blocking legacy generation. Explicit reviewed physiology and catalogue contracts own prescription fields; AI commentary cannot alter them. Why: partial catalogue coverage is not a complete planner, and preview and production share functions.

- Intensity domains (LT1 → MLSS → VO₂max) are defined only in `src/lib/zones/tfclDoctrine.ts`; zones, workouts and AI prompts must reference a doctrine domain, never hardcoded % VMA. Why: author-named methods were redefining intensities inconsistently.
- Audited sub-threshold cards use the canonical `sub_threshold` intent; safety prerequisites are shared by catalogue and replacements, and unrepresented qualitative exclusions stay automatically blocked. Why: method names, external power and coach approval cannot prove lactate control or missing safety conditions.

## Pourquoi cette section existe

Carte (audit 2026-10) pour retrouver où vivent les choses sans dépendre
d'une seule personne — pas une doc exhaustive ; à compléter au fil des
audits. Des règles locales vivent dans des `AGENTS.md` de sous-dossiers
(ex. `src/lib/print/`).

## Les trois couches

1. **Frontend** — Vite + React + shadcn/ui, hébergé sur Lovable
   (`https://tfclab.lovable.app`) ; `main` se synchronise avec l'éditeur
   Lovable dans les deux sens.
2. **Backend** — Supabase : Postgres (RLS sur toutes les tables, scopées
   `coach_id`/`user_id = auth.uid()`, cf. PR #301) + Edge Functions (Deno,
   `supabase/functions/*`).
3. **Intégrations** — Nolio (OAuth + sync bidirectionnelle,
   `supabase/functions/nolio-*`), Lovable AI Gateway (`LOVABLE_API_KEY`).

## Concepts clés et où ils vivent

**Objectifs/distances** — `ObjectifType` (`src/types/athlete.ts`). Trois
routages PARALLÈLES avec leur propre normalisation texte → clé canonique :
`normalizeGoal()` (`workoutCatalogBuilder.ts`, catalogue),
`normalizeObjectiveKey()` (`normalizeObjectiveKey.ts`, ratio par sport
dans `planValidator.ts`), `normalizeObjective()` (`physiologicalTargets.ts`,
cibles VLamax/TTE/FTP). `objectiveCoverage.definitionOfDone.test.ts`
(PR #298) casse la compilation si un objectif est oublié.

**Catalogue de séances** — `src/lib/workoutLibrary.ts` agrège les fiches
`enrichedWorkouts*.ts` + Pro Pack ; `buildWorkoutCatalog()`
(`workoutCatalogBuilder.ts`) filtre/score par objectif/phase/limiteur
(logs `[catalog_pipeline]`). `workoutGoalsEnricher.ts` infère
`goals[]`/`phase[]` des fiches historiques — `defaultGoalsForSport()` est
le point sensible.

**Génération de plan IA** — orchestrateur client `src/hooks/useAITrainingPlan.ts` :
config (`engines/plan/planConfigBuilder.ts`), chunks (tri long 5, trail 6,
sinon 4), edge function `ai-training-plan` (`systemPrompt.ts`/
`promptHelpers.ts`, JSON), parse (`lib/aiPlanParser.ts`), fusion
(`lib/plan/mergePlanChunks.ts`), validation (`engines/plan/planValidator.ts`,
règles B1-B12).

**QA de la génération** — `src/lib/plan/qa/` : profils synthétiques
(`syntheticProfiles.ts`) rejoués manuellement depuis `/debug/plan-qa`
(jamais en CI : coût IA réel) ; `checks.ts` applique B1-B14 (B15 est appliqué dans `finalValidation.ts`),
`checkB4For()` = dispatch exhaustif par profil.

**Zones/intensité** — `src/lib/zones/tfclDoctrine.ts` (seule source).
VLamax/métabolisme — `src/lib/v2/` (`vlamaxTargets.ts`,
`maderMetabolicModel.ts`). Cibles par objectif/ambition —
`src/lib/physiologicalTargets.ts`.

**Playwright** — `e2e/`, `playwright.config.ts`. "Mobile Safari" tourne
sous WebKit (seul moteur reproduisant les bugs tactiles Safari). Harnais
dev-only `src/pages/__e2e/` (gardés par `import.meta.env.DEV`).

**CI** (`.github/workflows/ci.yml`) — `vitest` (tsc + suite), `deno-test`
(`supabase/functions/ai-training-plan/` puis les autres `supabase/functions/*/` ayant des `*.test.ts`), `playwright`
(chromium + webkit).

## Pièges connus

- Un nouvel objectif doit être câblé dans les 3 routages + 
  `syntheticProfiles.ts`/`checks.ts`, sinon le test de couverture échoue.
- Une fonction `nolio-*` utilisant la clé service-role DOIT vérifier
  l'appelant (`getClaims`, cf. `nolio-list-athletes`) — `verify_jwt` ne
  suffit pas, la clé anon est elle-même un JWT valide.

## Corrections du générateur — portée sportive

- Quand une cause est partagée, corriger le mécanisme commun plutôt qu'ajouter une exception par objectif. Ne pas généraliser une prescription propre au 10 km.
- Vérifier les impacts sur 5 km, 10 km, semi-marathon, marathon, trail, Half-Ironman et Ironman, avec les fixtures et tests existants, complétés par des non-régressions représentatives.
- Préserver les spécificités physiologiques, quotas, périodisation et récupération de chaque discipline. Une voie dédiée (ex. trail ou LCW) ne doit pas hériter silencieusement des règles d'une autre.
- Le rapport distingue corrections communes, corrections spécifiques, disciplines effectivement testées et comportements restant à vérifier. Un test 10 km vert ne valide jamais le moteur entier ni la qualité sportive d'un plan réel.

- The reference snapshot is chosen only by `pickReferenceSnapshot` (`src/lib/referenceSnapshot.ts`): active snapshot, else date ↓, created_at ↓, id ↓. Why: same-date ties made screens and engines use different snapshots.
- Bike VLamax is locked as measured only with lab provenance or Staff-mode entry; unknown TTE reaches limiter detection as null, never 0; run TTE lives only in `tte_observed_min_run`. Why: estimates and missing data were presented as measurements.
- Snapshot save checks (ranges, power-duration order, threshold pace vs VMA) live only in `checkSnapshotForm` (`src/lib/snapshotTestDays.ts`) and run on both create and edit. Why: create and edit used to validate differently.
- Nolio TTE imports use selected measured timestamps from a dedicated session and a separate prior coach-validated threshold session, explicit units and continuous/exhaustion confirmations; missing streams or capped tests never fill observed TTE as a measurement; the period finder may only propose, "to check", the longest continuous effort ≥95 % of FTP/threshold pace as a minimum. Why: best records, elapsed session time and planned stops cannot measure threshold-to-exhaustion duration.

- The plan page engine selector defaults to IA and only adds DET-ENGINE through the shared `integrations/det/DetCoachPanel` (worker under `public/__det/v1/`); DET refusals are shown and never fall back to IA. Why: the IA path must stay untouched while DET reuses the page's exact configuration and limiter order.
