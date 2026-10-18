# TFCLab — P3 causal traceability: diagnostic findings (2026-10-17)

Status: **audit only**. No generation, production behavior change, merge or deploy.

## Verified from source and CI

- PR #386 characterization suite: **9/9 passing** (CI run 39061820109). Frontend Vitest: **2124/2124 passing**; Deno, ESLint and Playwright jobs successful.
- The final report builder is invoked from `src/lib/plan/qa/usePilotCockpit.ts` with `plan: merged`, `planConfig: preparedContext?.planConfig ?? profile.planConfig`, and `allowedCatalogIds: plan.lastAllowedCatalogIdsRef.current`. Therefore **the call site does pass the allowed-catalog ref**; whether the ref actually contains IDs in the failing run is still unverified.
- `preparePilotTrainingPlanContext.ts` merges `profile.planConfig` and `prepared.planConfig`; the latter takes precedence. This is a **potential overwrite point** for `identifiedLimitersRaw` and `strategyContext` if those fields are supplied or absent differently upstream. Do not claim data loss without runtime evidence.
- `findCausalPair` in `sessionPhysiologicalTraceability.ts` only matches seven hardcoded lever contracts. The `hrv_adaptation` contract has `limiterKeys: []`, so **it can never return a limiter–lever pair**, even if that lever is active. That is deterministic.
- `classifyIntentEvidence` uses first-match regex priority. An incidental `test` can outrank `récupération`; a `force` mention can outrank `proprioception`. Characterization tests confirm these mechanisms on synthetic cases, **not yet on the exact 45 generated sessions**.
- `parseDose` compares the final duration to catalog bounds and the final max zone to the catalog Main max zone. Regex-extracted repetitions/recovery are text-form sensitive; an extraction mismatch is not sufficient evidence of an unsafe workout.
- The report's `verified` criterion requires an identified intent, a causal pair, verified dose, allowed catalog membership, no critical conflict and adequate confidence. Thus 0 verified can result from missing attribution evidence; it is **not** a plan-quality score.

## Priority investigation — before changing generator behavior

1. **Runtime evidence preservation**: for each final session capture (redacted) the profile ID, catalog ID, intent family, final-intent evidence source, limiter list, strategy levers and confidence, allowed-catalog membership, dose substatuses, anomaly codes and classification reason. Avoid including personal athlete data in logs.
2. **Pipeline continuity**: check whether `identifiedLimitersRaw` and `strategyContext.levers` survive `prepareTrainingPlanContext` → `preparePilotTrainingPlanContext` → `usePilotCockpit`. Distinguish missing, empty, and unrecognized values.
3. **Contract coverage**: inventory actual strategy lever IDs, compare to the seven contracts and label missing links `unsupported_contract` vs `missing_evidence`. Never auto-verify unsupported links.
4. **Intent ambiguity**: compare catalog Main objective, title/tags, full structure and final session text before changing regex priority; ensure high-intensity sessions cannot be reclassified as easy.
5. **Dose equivalence**: compare structured interval blocks where available; do not weaken zone ceilings, prohibition checks or genuine duration/structure conflict detection.
6. **Independent sporting evaluation (Dimension B)**: compare whole-plan load progression, intensity distribution, specificity, recovery and athlete constraints. This is separate from traceability and requires the actual generated plan.

## Proposed decision gate

No generator fix and no claim of improved sporting quality until (a) exact report JSON + generated plan are reviewed, (b) each critical conflict is classified as true prescription / catalog metadata / validator false positive / insufficient evidence, and (c) a before/after deterministic benchmark is green.

## Evidence and limitations

Source: `src/lib/plan/qa/sessionPhysiologicalTraceability.ts`, `src/lib/plan/intentFamily.ts`, `src/lib/plan/qa/usePilotCockpit.ts`, `src/lib/plan/qa/preparePilotTrainingPlanContext.ts`, and PR #386 CI run 39061820109.

The previously reported 45 sessions (0 verified, 43 uncertain, 2 not verified, 17 critical conflicts) are a user-provided result; their full JSON and plan are not yet available for this audit. No claim is made that those 17 are all false positives.
