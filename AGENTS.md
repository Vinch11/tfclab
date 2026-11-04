# Architecture rules

- Intensity domains (LT1 → MLSS → VO₂max) are defined only in `src/lib/zones/tfclDoctrine.ts`; zones, workouts and AI prompts must reference a doctrine domain, never hardcoded % VMA. Why: author-named methods were redefining intensities inconsistently.

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
(jamais en CI : coût IA réel) ; `checks.ts` applique B1-B12,
`checkB4For()` = dispatch exhaustif par profil.

**Zones/intensité** — `src/lib/zones/tfclDoctrine.ts` (seule source).
VLamax/métabolisme — `src/lib/v2/` (`vlamaxTargets.ts`,
`maderMetabolicModel.ts`). Cibles par objectif/ambition —
`src/lib/physiologicalTargets.ts`.

**Playwright** — `e2e/`, `playwright.config.ts`. "Mobile Safari" tourne
sous WebKit (seul moteur reproduisant les bugs tactiles Safari). Harnais
dev-only `src/pages/__e2e/` (gardés par `import.meta.env.DEV`).
`src/pages/__qa/` (DEV-only) n'est pas sous `ProtectedRoute` : chaque page
vérifie elle-même origine QA + getSession + getUser + UID autorisé, avec
délai, avant tout SELECT. Pourquoi : les gates génériques bloquaient l'audit
en chargement infini ; la RLS serveur reste la seule barrière de données.

**CI** (`.github/workflows/ci.yml`) — `vitest` (tsc + suite), `deno-test`
(seulement `supabase/functions/ai-training-plan/`), `playwright`
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
- `plan_versions` writes use a content-derived id (SHA-256 of the canonical payload minus the volatile `plan_json._provenance.generatedAt` → UUID v8, `appendOnlyPlanVersionSave.ts`) plus exact read-back on the same view; never browser storage/TTL. Why: random/tab-scoped ids, then the generation timestamp, created duplicates for unchanged content; earlier-scheme rows are not reconciled.
- DET export checks (`src/lib/plan/detExportConformity.ts`) are offline, compare each PDF block (`data-session-key`, source regions `data-src`, info `data-role="info"` ignored) to its own source session, and report Nolio BLOCKED until a pure V2 mapper from `detStructuredWorkout` exists. Why: global text search let swapped or catalogue-borrowed content pass, and a local payload never proves a real send.
- The PDF renders the saved session verbatim (no Z-downgrade, no title substitution) and `formatFicheText` must be lossless, falling back to raw text. Why: a list heuristic once replaced a whole prescription.
- DET structure for export comes only from configured+admitted V3 blocks (`experimental/det-engine/v400-structured-workout.ts`), never from reparsing `details`; any gap is an explicit refusal. Why: default catalogue doses or parsed text could silently differ from the approved prescription.
- DET QA lab (`/__qa/det-lab`, DEV + QA backend + getUser + Coach A/B only) runs the real engine through pure `experimental/det-engine/*-core.ts` setups; tests wrap them with vitest `expect`, the browser with `src/qa/det-lab/strictCheck.ts`. Why: no vitest/node:fs in the bundle while keeping the CI-proven scenario inputs identical.
- Plan engine provenance lives in `plan_json._provenance` (`src/lib/plan/planProvenance.ts`); absent or malformed ⇒ "moteur non renseigné", never inferred. The release declaration hashes DET engine + V3 catalogue (component `det-engine`, also inside `frontend`). Why: a DET/catalogue change must invalidate the declaration.
- DET coach-input reviews live in append-only `det_coach_review_contexts` (no UPDATE/DELETE grants), bound to coach, athlete, SHA-256 of the input snapshot and the DET engine component hash; any change makes the review stale. Why: approvals must never be reused across athletes/coaches/profiles or filled from fixtures.
- Nolio V2 planned exports go only through `supabase/functions/_shared/nolioV2/` (pure `plannedMapper.ts` from `detStructuredWorkout`, `plannedClient.ts` sender, `ledgerSupabase.ts` on service-role-only RPCs `nolio_v2_claim_operation`/`nolio_v2_transition_operation`, injected-fetch `httpFetch.ts`) called by Edge `nolio-v2-send-plan` after getClaims + plan/athlete ownership; claim `sending` before POST, never resend an uncertain op, reconcile only via the contract GET list/detail (`read-contract-2026-11-02.json`) where any unreadable read is unknown; connections come only from service-role-only `nolio_v2_connections` bound to coach+athlete (`connectionStore.ts`); V1 code stays separate. Why: V2 creations are not deduplicated and V1 ids/tokens/callbacks are not valid in V2.
- Saved `plan_versions` rows are immutable: rename/edit creates a new version via `src/lib/plan/planVersionEdits.ts`, and restore-as-current archives the old current append-only before an exact-receipt upsert of `plans`, reporting partial/uncertain states; plan adaptations (`usePlanAdaptation` via `adaptationArchive.ts`) use the same saver and refuse DET-structured plans. Why: UPDATE of a version silently rewrote history and a two-write restore could claim success after a partial failure.
- Display paths (viewer, history, PDF) render the saved session verbatim; run-only bike intensity is flagged by `isRunOnlyHighIntensityBikeSession`, never rewritten. Why: screen and PDF showed different prescriptions.
- DET coach-input families live only in `COACH_FAMILIES` (`experimental/det-engine/v401-coach-inputs-core.ts`, details in its AGENTS.md): exact canonical keys, CI-proven option sets/envelopes; outside ⇒ explicit refusal, never AI; only admitted V3 sources + coach-approved bricks. Why: substring keys and native cards bypassed coach review.
- Coach session clocks resolve the UTC offset at the actual local instant (`resolveLocalInstant`); nonexistent/ambiguous DST times are refused unless the coach chose an occurrence. Why: a noon-based offset shifted 01:00 sessions by one hour on DST days.
- Coach A write recipe (`/__qa/coach-a-recipe`, `src/qa/coach-a-recipe/recipe.ts`) runs only in the coach's own browser session after DEV + QA origin + getSession/getUser = Coach A + owned athlete, uses only the common saver/restore mechanisms, saves a reference archive + `reference` report before touching `plans`, and writes append-only reports to `qa_coach_recipe_reports`. Why: the test browser cannot receive a manual session and no replacement session is allowed.
- QA pilot review (`/__qa/pilot-review`, `src/qa/pilot-review/review.ts`) stores human QA opinions append-only in `qa_pilot_review_reports`, bound to the canonical plan SHA-256 (generatedAt excluded) rechecked at submit; SQL CHECKs forbid any granting flag. Why: a QA opinion on a synthetic plan must never become an attestation, prescription permission or Nolio send.
- Nolio V2 token refresh goes only through `_shared/nolioV2/tokenRefresh.ts` + service-role RPCs `nolio_v2_refresh_begin/commit/fail` (row lock, lock_id lease, generation fencing; expired lease ⇒ unknown, never retried; one grant per Nolio account else fail closed); sport/exercise refs come only from `refs.ts` reads of the selected athlete and are validated at activation (`nolio_v2_activate_connection`). Why: Nolio rotates refresh tokens with no grace period, and IDs must never be guessed.
- Nolio V2 dry_run QA goes only through Edge `nolio-v2-dry-run` + `_shared/nolioV2/dryRun.ts` (fixed fixture, `dry_run:true` forced last and re-checked by a dedicated fixed-URL transport, strict `WorkoutDryRun` success) with service-role-only receipts in `qa_nolio_v2_dry_run_receipts` (clients SELECT own only); it never imports `sendPlannedV2`/ledger and `httpFetch.ts` keeps refusing `dry_run`. Why: the normal sender must never become a dry-run path, and a forged or arbitrary 2xx must never count as validation.
- The private `team_scope_forbidden` context (team name, official scopes, nolio.io options link) is projected only by `_shared/nolioV2/teamScopeContext.ts`, returned only in the calling coach's HTTP response and re-validated client-side after a concordant receipt; never stored in receipts, logs or proofs. Why: it is useful only to that coach and must not leak private Nolio data.
- The single real Nolio V2 QA trial goes only through Edge `nolio-v2-trial-session` + `_shared/nolioV2/trialSession.ts`: one frozen row per (coach, athlete, recipe) in `qa_nolio_v2_trials` (date + payload hash immutable by trigger), SQL CAS `frozen→sending` before the only POST, any later state is read-only verification; "verified" requires full-day list + every detail with exactly one marker and exact match, recorded in append-only `qa_nolio_v2_trial_receipts`. Why: Nolio does not deduplicate creates and the general sender retries after 429 and trusts a returned id.
- QA uses marked simulation, durable verification and ordinary coach reviews; none grant prescription/release approval. QA planning dispatches DET/IA without fallback. Read nested AGENTS.md in src/components/plan and supabase/functions/_shared/nolioV2. Why: stale proof cannot grant sends.
