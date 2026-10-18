# TFCLab P0 B-5K — Deployment readiness (2026-10-18)

**Recommendation: staged rollout of read-only diagnostics, not automatic generation blocking.**

## Current status
- PR #387 is draft and based on the characterization audit branch, not `main`. Do not deploy directly from this PR.
- Last known green full CI: #600. CI #601 for cockpit hook integration is pending as of this document.
- P0 audit is deterministic, run-only, and limited to `trainingLevel="untrained"`.
- The cockpit hook now exposes `exportLastRunSafety(config)` for the last merged plan, but **no user-facing export control is wired**.
- No paid Gemini run is necessary to validate the offline export.
- Six acceptance cases remain `it.todo` and are not implemented.

## Deployment gates

### Gate A — Preproduction
1. CI green for the exact candidate commit, including TypeScript, Vitest, Playwright, Deno, ESLint.
2. Rebase or create a clean integration PR against `main`; inspect conflicts and diff, since #387 targets the audit branch.
3. Wire the cockpit export to an explicit coach-only UI action. Confirm it works with a stored `mergedPlan` without calling Gemini.
4. Ensure absent RUN-only contracts are visibly marked *not evaluated* rather than passing by default.
5. Validate privacy: exports contain complete athlete plan data; local-only download, no accidental logging or upload.
6. Verify duplicate sessions, race weeks, deloads, strength exclusions and missing history.
7. Smoke test on staging with a known anonymized plan.

### Gate B — Production (read-only)
1. Coach-only access, feature flag default OFF, simple rollback.
2. No change to generator prompts, validator thresholds or session prescriptions.
3. Explicit diagnostic limitations in UI; no misleading safety certification.
4. Monitor client errors and export correctness, with a rollback owner.
5. Product owner authorizes deployment after staging review.

### Gate C — Active P0 blocking (separate project)
- Formal definition of `sessionsPerWeek`, `week1HoursMax`, `weeklyIncreasePctMax` across CAP, strength and mixed plans.
- Full anonymized historical fixture, acceptance tests completed and coach review.
- Structured intensity/dose checks instead of title keyword heuristics.
- Regression coverage on beginner, trained, marathon and triathlon profiles.
- Separate reviewed PR, explicit approval and rollout strategy.

## Rollback
Disable the coach-only diagnostic feature flag, retaining the existing generator and validation path. Do not delete plans or silently alter generated sessions.

## Decision
**GO** for continued implementation and staging preparation after all Gate A checks. **NO-GO** for immediate production deployment or active blocking at the current state.
