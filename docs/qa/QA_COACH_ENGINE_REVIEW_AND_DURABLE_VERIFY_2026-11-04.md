# QA — coach engine choice, human review and durable real verification

Baseline: `c82da135af91fba306c1fd8ed7febefd4a404c11`. Isolated QA only, 4 November 2026.

## Delivered
- Real readback receipts are append-only and bind owner, athlete, immutable version, plan/refs/ops/body hashes, kind/path/date/session and private provider resource. Client SELECT excludes the provider id. Unknown/absent/ambiguous never become success. Exact persisted readback reconciles lost ACK through CAS; no automatic second POST, including 429.
- Reusable five-category coach review inspects the saved prescriptions, saves explicit decisions/blockers through authenticated ownership-checked server and reads them back exactly. It binds full saved plan hash (including saved timestamp), refs and ops. Changed inputs invalidate eligibility. It grants neither prescription, independent science, release authority nor export consent.
- Normal QA planning has an actual DET/IA selector. Shared coach fields feed the real coach adapter or existing windowed IA path. DET candidate enters common validation/viewer/append-only saver; structured prescriptions are not rewritten by AI post-processing. Inputs survive engine switching. A/B owned QA athlete guard applies. Unsupported DET families refuse; no canned athlete fixture or AI fallback.
- AI provenance recorded at actual JSON generation and full-window assembly. IA guard retained, no model call in tests. Common export access opens the QA review/mapping workflow; own IA versions can be selected, but unstructured IA export remains refused rather than guessed.

## Hard remaining gates
A synthetic/unqualified plan remains nonprescriptive. New candidate provenance stays `prescriptionAllowed:false`. An ordinary authenticated coach review now has real storage/loader; it is NOT scientific attestation. There is NO verified sporting release authority installed: endpoint unconditionally retains `release_sporting_attestation_absent`, even if a source manifest is archived/attested. No release bypass or automatic approval exists.

DET actual coach-input support is marathon road only, with reviewed sources, provenance-bearing anchors, clock and supported limiter permutation. The 18 synthetic families are not advertised as real-athlete support. Other scenarios remain refused.

## Evidence and checks
- Vincent's successful GitHub Deno run 41780659209 concerns the preceding exact 25-file snapshot only, not these changes.
- Prior provider 75/75 evidence remains acquired for UNMARKED bodies, not falsely reused as marked-body proof. Earlier trial, archives/current plans and receipts untouched.
- Focused selection: 181 tests passed across 10 files, including actual engine panel dispatch, review stale/cross-coach decisions, persistence/readback/lost ACK, unknown, deadline, mixed resource and save/reopen.
- Harness types/build OK. Deno shared and both entrypoints check pass with isolated `nodeModulesDir:none`; default local node_modules resolver initially failed on existing cors package exports.
- New files lint: 0 errors, 2 effect-cleanup warnings. Legacy pages/hooks have pre-existing no-explicit-any/no-empty violations (62 errors); scoped lint with those rules disabled has 0 errors / 23 warnings. Not represented as clean unmodified strict lint.
- Migrations 0020/0021/0022 applied; SQL metadata confirms NOT NULL positive facts and SELECT-only browser/service SELECT+INSERT. Effective ACL initially revealed inherited default grants; 0022 explicitly revoked all roles then regranted minimum privileges. Final effective checks: browser INSERT false, service UPDATE/TRUNCATE false, anonymous read false, provider resource client SELECT false. No receipt seed or fabricated positive database record.
- QA functions deployed only: `qa-plan-coach-review`, `nolio-v2-send-plan`; unauthenticated probes 401 each. Exact submitted deployment hashes and per-file source hashes in JSON.
- Chromium localhost signed-out cold/reload `/`, `/__qa/pilot-review`, `/planning/ai-plan`: ReactDOM 200, no bootstrap errors, zero Nolio/function requests; protected routes go to auth. Intentionally denied storage triggers existing bounded bootstrap error, not false readiness. No restart or storage deletion. External hosted preview and authenticated real flow NOT verified.
- Manifest recalculated, nonattested. No paid AI, authenticated Nolio calls, JWT impersonation, real calendar/data writes, production/V1/main/publication or merge.

## Next coach action
In your existing QA session open `/planning/ai-plan`, choose DET or IA; for DET confirm supported marathon inputs, source qualifications and clock. Save candidate through existing append-only version saver, reopen it through common export access, correct associations, simulate the complete MARKED payload and save the five-category coach review. Real send remains blocked until genuine prescription qualification and separately verified sporting release authority are supplied; do not retry earlier technical trial.

Independent reviewer check: 28 exact server files at source `7469eb1cfaf1e0fd0ddbafabf6c11ff3d4b308d4` passed [Deno CI](https://github.com/Vinch11/tfclab/actions/runs/41783154651). Static types only; authenticated application flow remains unverified.
