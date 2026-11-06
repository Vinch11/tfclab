# V3 plan generation from the shared profile — 6 November 2026

The primary simple-panel action now assembles one chosen V3 prescription per non-race slot, with the actual bounded source blocks. The former three-source study remains folded as alternative-source inspection. This is a **proposal for review**, not an accepted or prescriptive plan.

`appPlanningV3Proposal.ts` preserves the frozen shared app fingerprint, diagnostic limiter order, common calendar, declared event list, pinned family source pool, known training level and negative restrictions. Selection uses recurring complementary focus and source-use diversity. It never loads a synthetic athlete, rebuilds a diagnostic, creates human source approvals or invokes AI.

The proposal stores the configured source blocks and original source fingerprint. Its separate `v3_plan_proposal` schema cannot enter the qualified runner, common saved-plan/export schemas or Nolio. A proposed brick contains two actual V3 component prescriptions; its unconfirmed transition stays unknown. Unknown swimming domain paces are never derived from CSS. Unresolved totals are explicitly pending, not a zero-minute workout or a passed weekly cap. Strength is counted in sessions; only an actual timed source protocol contributes known minutes.

The bounded week search rejects empty mandatory source domains, known-minute budget overruns, unachievable fully timed recovery reductions, absent required quality blocks, proved polarization failures, cumulative triathlon ratio failures when actual component minutes are known, and recovery/overlap conflicts proved by explicitly entered clocks. The weekly ceiling comes from the common preparation contract as well as the entered hourly cap. Unknown durations cannot certify progression or complete polarization. Calendar recovery evidence is not athlete readiness or effective limiter coverage. Unknown limiter definitions are retained and exposed; an unsupported primary refuses rather than being replaced.

A shared filter defect was corrected: the historical VO2 prohibition regex matches ordinary strength “répétitions”. V3's explicit VO2 domain is now required before that regex may exclude a source for the VO2 restriction. Other prohibitions and reported contraindications still exclude sources.

Validation before QA publication:

- 20 focused tests passed: complete proposed source selection for 70.3/12 weeks, Semi/8 weeks and Marathon/16 and 40 weeks; unknown swim pacing; original event/limiter/fingerprint preservation; identity changes; negative restrictions; prior candidate-study regressions.
- 33 existing strict shared-app/real-V3-engine integration tests passed, including recurring exact-dose checks on long plans.
- Application TypeScript and incremental ESLint passed; production build passed with the fresh source declaration.

The UI checks authenticated coach and athlete before and after generation and discards changed inputs/restrictions. No source approval, athlete write, review write, plan archive or Nolio send is performed by this new action. Qualified generation remains available separately. Production deployment and complete sporting finalization are not claimed.

## Sporting arithmetic and calendar checks — follow-up on 6 November

- 70.3 base/build/peak brick choices use the documented V34 component IDs and exact bounded doses. This avoids arbitrary long running components. No composition/transition review is fabricated; unknown transition duration keeps the total uncertified.
- Source-bound integrity is recalculated from the actual saved proposal blocks and original source fingerprint, with no silent duration repair.
- Partial entered clocks are reused independently of unrelated missing confirmations. Invalid clock values such as `10:99` are rejected; missing timezone does not erase entered times. Official races never borrow a regular training start time.
- Cross-week source recovery and same-day overlap are audited. A known duration lower bound can prove a conflict even when transition time is unknown; it cannot prove safety.
- Existing strict triathlon ratios use exact exercise component minutes from load weeks without official events. Strength and transitions are explicitly excluded from that ratio denominator, not treated as zero-minute sessions. Missing swimming-domain paces keep ratios pending, never inferred from CSS.
- Required quality uses positive configured MLSS/VO2 dose; structured low-intensity and unknown-minute targets retain the existing thresholds. This does not prove physiological limiter coverage.
- Search visits independent strength choices last and prunes optimistic ratio/polarization impossibility bounds, avoiding repeated cardio searches. The node limit is unchanged.
- Review findings are grouped by theme in the viewer, with proved blockers visibly separated.

Verification: seven app/real-assembler regression files passed 95 tests; the final three-file targeted rerun passed 47 after two added regressions, covering 97 unique tests. Complete source proposals were verified for 70.3 at 9/9.5/10 h, semi 8 weeks and marathon 16/40 weeks. Existing strict integration scenarios retain their separate reviewed-source test evidence. Application TypeScript, changed-file ESLint, QA TypeScript and QA production build passed. Engineering source declarations were regenerated separately for candidate and QA source trees; neither is a scientific or production attestation.

Remaining: a dedicated approval-bound save/reopen/finalization lifecycle for `v3_plan_proposal`, actual sporting review, effective limiter coverage evidence and independent scientific validation. This action still cannot archive an approved plan or send it to Nolio. No real athlete, review or training-calendar write was performed.

## Device-only proposal preservation

Explicit Conserver/Retrouver actions preserve the unreviewed proposal in a separate browser-local coach/athlete namespace. Strict schema, SHA-256, immediate readback, context binding and authentication rechecks protect reopening. Changed profile/settings/restrictions or source integrity refuse restoration. Storage failures are visible. This does not synchronize devices, enter approved-plan history or authorize Nolio. Backend synchronization and approval-bound finalization remain open.

## Restore the common generation journey

At the user’s explicit request, the normal planning page no longer exposes V3 proposal generation or device-only storage. The existing main Generate action dispatches to IA or the qualified DET panel action. DET prerequisites are expandable; missing reviews remain explicit and never become fabricated confirmations. Accepted DET results retain their frozen-profile provenance and enter the existing ParsedPlan viewer, common save/history path and existing export guards. The normal path does not convert an unreviewed proposal to a qualified plan. Busy state is shared; pending installation awaits common prevalidation and ownership recheck, and changes to panel context invalidate it. The engine selector remains limited to the isolated QA deployment pending production release. Individual/week regeneration and multi-athlete bulk generation retain their existing limitations; no production rollout or scientific sign-off is asserted.

### Available-data generation in the common viewer

The normal button now calls appProfileDetPlan: it assembles bounded V3 sources from available app data without demanding every manual athlete/source confirmation first. Timed alternatives are preferred when individual swimming paces are missing. Full configured source blocks, unknown durations, frozen input and raw limiter order remain embedded. The common ParsedPlan display and archive metadata use explicit DET app-profile provenance (no synthetic fixture or human approval). Pending checks are warnings in the common viewer; proved violations refuse assembly. Legacy Nolio export remains blocked, and unfinalized prescriptions cannot be assigned to the active training calendar. Qualified/manual DET remains separate advanced functionality. Production rollout, approval-bound finalization and cross-device live-backend QA are not completed by this change.

### Common review archive correction

Enregistrer au plan calls persistPlanVersion and writes only plan_versions, not training_plan. A mistaken app-profile blanket block was removed. appProfileDetArchiveSummary validates provenance, source schema, frozen-profile identity, current athlete and source-bound dose integrity, and sends the full plan plus a review_required summary through the existing append-only saver/readback. Scores/grades remain null, no critical override or human approval is fabricated. Unknown references and original blocks survive reopening. An offline test verifies exact common-saver round-trip, duplicate idempotency, wrong-athlete/fingerprint refusal and continued Nolio legacy blocking. The live backend round-trip and final prescribed export are not proven by this offline test.

### Structured Nolio preparation

Computable single-sport app-profile prescriptions now retain a strict V400 structural preview alongside original V3 blocks. The shared converter is reused without calling the admitted-source builder or fabricating admission: detStructureAdmission remains pending outside the strict workout object. Duration/missing-target and multisport refusals remain explicit. Store canonical sports for the existing V2 extractor/mapper and localize the common viewer badge; no backend schema/mapper relaxation or deployment is required by this adapter. The real-send provenance/release gates and legacy sender block remain unchanged. Tests verify actual V2 operations with synthetic refs, exact duration conservation, unresolved multisport refusal and false prescription authority. No provider request is sent. A read-only QA database inspection found no app-profile archive yet for QA_DET_A/QA_DET_B; live coach-session saving remains unverified.

### Common prevalidation official-race fix

Reproduced the coach-visible generic blocked message: the real shared 70.3/12-week/10-hour prevalidation reported declared_event_unplaced in week 12. The race-week training-brick maximum was zero, so the common layout did not reserve the official triathlon. Shared preparation now opts into the existing officialRaceOutsideTrainingQuota mechanism only for a race week with zero training-brick maximum and a declared brick event. It reserves the actual race date without authorizing a training brick or relaxing daily/rest-day/day-ban checks. A regression proves exactly one official race and no training brick; another retains refusal on a banned Sunday bike day. The app-profile callback exposes blocking codes/weeks and opens details rather than only showing a generic toast.
