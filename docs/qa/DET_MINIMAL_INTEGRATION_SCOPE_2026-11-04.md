# DET integration scope — 2026-11-04

Reference: production `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`; candidate examined: `2c1118199` (PR #461 on #460).

## Contract

Existing app diagnostic and limiter ranking remain the source. DET consumes the page's frozen athlete/config inputs. Generation must neither rebuild a partial diagnostic nor substitute an unsupported primary limiter. Existing AI remains available during QA. A synthetic acceptance is not an authenticated workflow acceptance.

## Final coach-facing engine choice

Confirmed user requirement (2026-11-04): the finished app must let the coach explicitly select **IA** or **DET-ENGINE** within the existing planning workflow. Both engines receive the same existing app profile, limiter priorities, coach choices, objectives and constraints. A refusal from DET must remain visible; switching to IA requires the coach's explicit choice, never automatic fallback. Keep the existing sporting and release controls for either route. The current QA selector is not evidence that this choice is available in production.

## Protected calculations

Git diff against the production reference: **no changes** in `src/engines/diagnostic`, `src/lib/v2`, `src/lib/zones`, `src/lib/limiterPrescription.ts`, `src/lib/physiologicalTargets.ts`.

A new regression suite compares the complete diagnostic returned by the extracted app pipeline with the actual diagnostic callback retained from production, on seven objective families and two threshold paces, including fatigue, economy, recent load and check-in inputs. This proves behavioral preservation for these synthetic inputs, not scientific validity.

## Existing-file inventory

The following modifications are already present in the candidate, not introduced by this audit. Their presence is not an approval to publish. Additive engine/library/test files are excluded from this list.

| Existing file | Integration area |
| --- | --- |
| `.github/workflows/ci.yml` | Release, build or QA wiring |
| `AGENTS.md` | Release, build or QA wiring |
| `e2e/print-plan-export.spec.ts` | Release, build or QA wiring |
| `index.html` | Release, build or QA wiring |
| `scripts/preproduction/plan-release-source.mjs` | Release, build or QA wiring |
| `src/App.tsx` | Existing page routing and shared inputs |
| `src/components/AIPlanViewer.tsx` | Saved plan fidelity, history and export |
| `src/components/PlanHistoryCard.tsx` | Saved plan fidelity, history and export |
| `src/components/__tests__/AIPlanViewer.currentPlan.test.tsx` | Saved plan fidelity, history and export |
| `src/components/__tests__/coachCalendarSafety.test.tsx` | Regression coverage |
| `src/contexts/ThemeContext.tsx` | Release, build or QA wiring |
| `src/engines/plan/__tests__/normalizeWeeksPhases.test.ts` | Shared planning behavior — review separately from generator replacement |
| `src/engines/plan/computePlan.ts` | Shared planning behavior — review separately from generator replacement |
| `src/engines/plan/normalizeWeeksPhases.ts` | Shared planning behavior — review separately from generator replacement |
| `src/engines/plan/planValidator.ts` | Shared planning behavior — review separately from generator replacement |
| `src/engines/plan/sessionSizingMatrix.ts` | Shared planning behavior — review separately from generator replacement |
| `src/engines/plan/weeklySlotLayout.ts` | Shared planning behavior — review separately from generator replacement |
| `src/hooks/useAITrainingPlan.ts` | AI provenance/QA format; preserve production AI behavior |
| `src/hooks/usePlanAdaptation.ts` | Saved plan fidelity, history and export |
| `src/integrations/supabase/types.ts` | Release, build or QA wiring |
| `src/lib/__tests__/aiPlanPDFExport.test.ts` | Regression coverage |
| `src/lib/__tests__/openPrintableHTML.test.ts` | Saved plan fidelity, history and export |
| `src/lib/aiPlanPDFExport.ts` | Release, build or QA wiring |
| `src/lib/aiPlanWorkoutEnricher.ts` | Release, build or QA wiring |
| `src/lib/ficheTextFormatter.ts` | Release, build or QA wiring |
| `src/lib/normalizeObjectiveKey.ts` | Release, build or QA wiring |
| `src/lib/openPrintableHTML.ts` | Saved plan fidelity, history and export |
| `src/lib/plan/__tests__/lovableBuild.test.ts` | Regression coverage |
| `src/lib/plan/__tests__/post419Contracts.test.ts` | Regression coverage |
| `src/lib/plan/catalogScope.ts` | Release, build or QA wiring |
| `src/lib/plan/intentFamily.ts` | Release, build or QA wiring |
| `src/lib/plan/refreshPlanValues.ts` | Saved plan fidelity, history and export |
| `src/lib/workoutCatalogBuilder.ts` | Release, build or QA wiring |
| `src/main.tsx` | Release, build or QA wiring |
| `src/pages/AITrainingPlanPage.tsx` | Existing page routing and shared inputs |
| `src/pages/PrintPreviewPage.tsx` | Saved plan fidelity, history and export |
| `src/pages/__tests__/aiTrainingPlanRaceGoalsPersistence.guard.test.ts` | Regression coverage |
| `src/qa/sports-plan-lab/__tests__/catalogueCountingBaseline.json` | Regression coverage |
| `src/types/workoutLibrary.ts` | Release, build or QA wiring |
| `supabase/functions/_shared/catalogueTrainingMinima.ts` | Release, build or QA wiring |
| `supabase/functions/_shared/intentEvidence.ts` | Release, build or QA wiring |
| `supabase/functions/_shared/planReleaseManifest.ts` | Release, build or QA wiring |
| `supabase/functions/_shared/planningFeasibility.ts` | Release, build or QA wiring |
| `supabase/functions/_shared/repairSportingEquivalence.ts` | Release, build or QA wiring |

## Shared planning changes requiring explicit accounting

- `computePlan.ts`: ignores races outside the plan window instead of moving them to an edge week; this affects the historical generator too. It is an independent correction, not a diagnostic change. Preserve its existing regression test; do not silently mix its validation with DET acceptance.
- `normalizeWeeksPhases.ts`: handles single-week phase labels and clamps short phase ranges. Shared AI behavior, independent correction.
- `planValidator.ts`: exposes zone-minute calculation, preserves unknown strength duration, adds bike/swim ratios and reconciles taper duration with a real event. These affect sporting validation and must retain dedicated coverage.
- `sessionSizingMatrix.ts`, `weeklySlotLayout.ts`: protected minima and explicit event accounting used by DET. Defaults and native callers must retain existing behavior.

Do not blindly revert these files: the candidate depends on exported types/functions and some changes correct proven historical bugs. Scope separation means distinct evidence and review, not restoring a known defect.

## Remaining delivery gates

1. Existing app input fidelity, including legacy diagnostic parity and real solver acceptance for marathon 16 weeks.
2. Full-context family/limiter coverage: triathlon brick refusal and long-plan refusals remain open in the previously observed matrix.
3. Authenticated save/read-back, reopen, PDF and Nolio mapping using the existing mechanisms. Current in-memory integration tests do not prove this.
4. Human inspection of the actual program; experimental reviews never grant production prescription.

No deployment, backend schema change or athlete/calendar write is performed by this checkpoint.

## Checkpoint verification

- Legacy parity: 7 objective families × 2 threshold paces; complete diagnostic equality.
- Latest shared-context integration: 17/17 tests passed (parity + actual solver integration), synthetic records only.
- Broader targeted checkpoint at parent 4bf48d339: 177/177 tests passed, including native race/phase regressions.
- Source unchanged in protected diagnostic/limiter modules. No claim of live backend validation.

## Generation → existing archive checkpoint

The ordinary page now attaches the generated DET calendar's archive metadata from its frozen app input. Saving uses that original start date, objective, race dates/goals and limiter override rather than whatever happens to be in the live form. Historical coach-input DET can use its stored snapshot; missing source dates refuse explicitly. Sessions and physiological calculations are unchanged. AI retains its existing metadata behavior.

Changing the selected engine invalidates pending QA actions immediately. In particular, an AI prevalidation completing after the coach switches to DET cannot launch the pending AI request.

Local verification: 47/47 targeted tests passed, covering the real marathon solver → metadata → append-only in-memory save/read-back/reopen, changed-form retry identity, historical DET, AI secondary goals, engine dispatch and verbatim session display. TypeScript and new-module lint passed. These are offline checks, not authenticated database or Nolio receipts. The three GitHub workflows for the preceding commit cc538ff8 completed successfully; that evidence does not belong to the next source commit.

## Semi long and QA schema checkpoint

The 30-week semi failed native gates with a 20-week Build block and a five-week load streak. The coach route now uses existing measured running mesocycle/taper certificates for long horizons. Phase splitting needs actual measured >=30% deload boundaries; taper labeling needs the configured V3 source doses and measured reduction. No session or physiological model is rewritten. Where TTE is primary on a long semi, the existing exact-source horizon/TTE audit and TTE candidate preference are also required; a missing TTE dose remains a refusal. Short-horizon behavior stays unchanged.

A complete 30-week semi now passes both the coach-input runner and the full app diagnostic path, preserving the app's automatic limiter order. The existing source pool and reviewed doses are unchanged. Frontend help text reflects this observed acceptance, conditional on profile and reviewed sources. Ironman and unsupported limiter/family combinations remain unresolved.

162/162 targeted frontend tests passed. The isolated QA backend lacked `det_library_source_reviews`; the candidate table was created there and its RLS/policies/grants checked by read-only queries afterward. No human review row was created. No production schema was changed. The QA preview still reports source ac891ceb5 and requires Lovable authentication in the available browser: this does not prove that the GitHub candidate is running there. See the schema checkpoint JSON for exact scope. The authenticated end-to-end route remains unverified.
