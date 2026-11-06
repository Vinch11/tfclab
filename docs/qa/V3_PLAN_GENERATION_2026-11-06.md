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

### Coach quality/readability and Nolio access

The 157-minute run in race week exposed a lost maxDurationMin: common activation slots are 20–30 min, but the draft retained only the minimum. maximumMinutes now reaches selection and rejects unbounded/oversized prescriptions. Easy-minute margin sorting applies only in load weeks; other weeks prefer smaller bounded choices. Tests verify race-week running <=30 min and no 157-minute run. Display formatting now uses min/s, pace /km or /100 m, W, explicit warmup/work/recovery/cooldown, repetition/RPE targets, translated missing references and contiguous phase ranges. Raw sources/targets remain unchanged. Existing saved plans are not rewritten; regenerate to apply selection corrections.

Read-only QA database inspection found an active V2 connection for QA_DET_A but no legacy nolio_id. The normal history now offers an isolated-QA Exporter vers Nolio link to the existing V2 preparation workspace with the exact version ID. The requested version is read with coach/athlete filters and authentication rechecked before display. Loading is read-only; the existing simulation, review, consent and real-send gates are preserved. It does not automatically transmit a plan and unresolved sources/compositions can still refuse export.

### Follow-up: native V3 correspondence and selection

The common legacy catalogue validator cannot resolve V3P source IDs. Native sessions now use their saved configured components, current source fingerprint/bounds/review metadata, exact displayed prescription, identity, sport and duration. Missing/tampered blocks still report issues; this correspondence is not sporting approval. Legacy metadata checks remain unchanged. New plans include the existing source intention, focus and methodology, alongside their configured blocks; old saved prescriptions stay verbatim.

Selection no longer maximizes easy-minute margin before searching: retain limiter focus, cumulative-ratio trajectory, source rotation and shortest bounded dose first. The existing polarization/weekly ceilings/source recovery constraints still reject proven violations. Unknown swim timing remains unknown. This addresses the observed overlong runs; it does not certify complete training quality, minimum weekly volume, missing swim references or complete strength sessions.

Nolio history action is labelled “Préparer l’export Nolio”. Its destination states app-profile plans cannot currently be sent, rather than suggesting the preparation link is a successful export. No sender/provenance/release gates changed and no real send was attempted.

### Complete strength and available-data swimming

Normal app-profile generation now selects supplemental full-session sources rather than single exercise cards. Eight strength sources cover A/B circuits across base/build/peak/taper, each with six named movements, timeboxes, repetition caps, movement/rest windows and RPE instructions. Bodyweight and assistance are explicit, with no invented kilograms/1RM or attested athlete load. Taper uses one easy circuit. The original 800 snapshot and the qualified family pools remain unchanged; these supplemental candidates do not imply scientific or human approval.

Twelve timed swimming sources provide easy technical sessions with warmup, work, recovery, cooldown and qualitative effort cues. Normal mode uses them if recovery/moderate paces are absent; explicit references retain distance-based individual prescriptions. Source-defined duration is exact, but distance and individual LT1/MLSS/pace are not predicted. CSS is never converted. The unreviewed structural preview preserves source-defined RPE and intended domains for these timed swims, with no numerical pace target. The unchanged V2 mapper can represent their RPE instructions. The qualified builder still refuses missing numeric domain targets; preview serialization grants no admission or real-send permission. This is not completion of live Nolio export. Existing brick transition/recovery/time checks and false prescription/release flags remain.

The strength RPE confirmation already entered in the panel is now forwarded, rather than dropped. It does not become a source review or blanket clearance. New bodyweight prescriptions use their own source instructions and need no guessed external load.


### Common-viewer Nolio selections

DET now has direct plan/week/session actions in the common viewer, including week ranges and multi-session selection. The old QA history shortcut is removed. The saved version ID comes from exact archive readback or history reopening, not a best-effort search. Every action rereads that owned version, compares its full prescription (only generatedAt and duplicate Markdown excluded), rechecks identity and discards stale responses. No client workout body is accepted. IA keeps its existing actions unchanged.

V2 preparePlan and both dry-run/send endpoints now accept an optional strict scope. Filtering precedes multisport expansion; selecting a brick retains both linked activities. Full plan SHA and version ID remain fixed; scoped operation digests bind simulation receipts, and the same operation retains its durable dedup key across session/week/full-plan sends. The ordinary human review remains bound to the full saved plan. No prescription, review, source or sporting-release gate was removed.

Deployment/validation limitation: the scoped Edge Functions must be active on the connected backend before partial exports can run. Repository and frontend synchronization alone do not prove that deployment or a successful Nolio send. The isolated QA sender refuses missing sporting release authority; the external signed-release path described below replaces the former unconditional refusal. No actual send or fabricated review was performed.


## V2 contract and finalization checks — 6 November, follow-up

The user supplied `migration-v1-to-v2(3).pdf` (19 pages, created 9 October 2026). The existing pinned V2 contract remains the implementation basis: opaque provider IDs, trailing-slash endpoints, typed workout nodes, separate competition operations, dry-run without creation, explicit no-target, pagination and exact readback. No V1 fallback or invented sport/exercise IDs was introduced.

The common export dialog now checks authenticated, owner-bound backend capabilities against the exact frontend release before simulation or sending. A simulation is confirmed only after reading its own matching durable job and per-operation receipts. Real delivery is reported only from matching latest unique-readback receipts; a returned create ID or a completed batch alone is not a delivery claim. Authentication or plan/scope changes invalidate positive results. The dialog provides explicit access to existing full-plan coach review and editable Nolio associations; ordinary review and export consent remain separate.

The hardcoded real-send refusal is replaced by verification of an external Ed25519 sporting release, scoped to the exact full release ID, engine version, mode, expiry and evidence hash. The public key and signed release are server-only deployment configuration (`NOLIO_V2_SPORTING_RELEASE_PUBLIC_KEY`, `NOLIO_V2_SPORTING_RELEASE_PROOF`), never browser inputs. No real release key, signed authorization, scientific approval or positive human review has been created. Missing, changed or expired authority still refuses. The candidate plan retains its original false prescription/scientific flags. The server can authorize only an exactly matching owned, fully covered, ordinarily reviewed plan under a verified external release.

QA Coach A/B may use the existing isolated QA review/send endpoints without a staff role, subject to their existing allowlist, QA backend/origin, validated claims and exact plan ownership. No account role was changed. Actual handler tests cover owner access and rejection of other owners, unknown actors and other backends without provider calls or writes.

Detailed internal exercise mapping keys accept up to 512 characters. Competition-only brick/triathlon sport associations may use a confirmed active nonstructured Nolio sport; training operations still require structured support. Entered sport clocks and declared event names survive normal generation, while absent times and race durations remain unknown.

The normal source supplement contains eight complete bodyweight circuits and fourteen timed swim candidates, including two explicit sustained-effort variants. Source RPE is a prescription instruction, not measured threshold or a CSS-derived domain pace. Dedicated FTP and swimming goals now use their explicit shared calendar quota convention; no other sport's quota is substituted. Existing hourly ceilings bound programme slot sizing and all prior recovery, taper, source and progression checks remain active. Repeated blocks display their source label and number of rounds; historical saved text remains accepted verbatim.

Verification: 192 tests passed across 16 targeted files, including full 70.3, running and standalone swimming generation, archived-source correspondence, PDF, common viewer and export guards, scopes, dry-run, real-send gating, exact readback, signed-release verification, mappings and actual QA endpoint access handlers. Application TypeScript passed.

Still unverified/open: deployment of the changed Edge Functions on the connected backend; actual provider simulation/send/readback with that deployment; real external sporting approval. Unreviewed normal-app brick compositions and transitions still require explicit preparation and cannot be claimed as completed whole-plan 70.3 export. This change does not publish production, prescribe to real athletes or rewrite saved versions.
