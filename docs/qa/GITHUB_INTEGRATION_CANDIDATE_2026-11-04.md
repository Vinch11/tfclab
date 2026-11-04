# TFCLab integration candidate — 4 November 2026

This is an integration branch for review, **not a completed product or permission to prescribe**.
No new paid Lovable task was launched. No main/production publication, real athlete copy,
authenticated Nolio operation, calendar write or paid AI generation was performed.

## Source composition

- Production reference remains read-only: `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`.
- Existing experimental engine/library source: PR454 `b9ba425ec5ae1fea531387f17d479d78947af9fb`.
- QA integration source read without executing another builder turn:
  `ac891ceb5e293298b276dfde9d28435c1d9e673a`, with its adapter, source provenance,
  immutable plan saver, reviewer and Nolio V2 modules.
- This is a versioned **composition**, not a claim that the entire QA snapshot equals production.
  Large files were reconstructed from immutable diffs when the read API truncated them.
- Only the reachable engine modules and the requested acceptance benches are included. The 340
  unused historical study files from the first transfer remain available in PR454 and were removed
  from this candidate; no original branch or athlete archive/receipt was deleted. This fixes the
  first CI lint failure from importing those historical studies without disabling the lint gate.
- Existing root package/lock files are retained. The incidental QA editor-plugin upgrade is excluded.
- Historical QA receipts/reports containing provider identifiers are not imported into this branch.

## New work performed directly on the code

1. Reusable human source-content review for marathon/semi pools. The reader shows the exact
   source blocks, prerequisite/contraindication lists, phases and permitted dose changes.
   Opening it never creates a review. A human must explicitly confirm and supply notes.
2. A manifest hash includes the full source sheets and dose settings, separate from the pinned pool hash.
   Reviews are coach-bound and append-only. A withdrawal is another row; the newest exact-bound row wins.
3. Reuse supplies **no athlete facts**. Current explicit load/fatigue/injury/prerequisite/contraindication
   answers are required; family, planning fingerprint and the exact current answer set are checked.
   The original engine still verifies eligibility, anchors, clocks, source hashes and doses.
4. Athlete/profile changes reset confirmations; they cannot silently migrate from the previous athlete.
5. A separate candidate SQL script defines `det_library_source_reviews` with owner-only RLS,
   staff-coach INSERT, no client UPDATE/DELETE, and false scientific/prescription flags.
   **SQL has not been executed.** If the table is absent the UI reports it and blocks this route.
   The existing Advanced per-athlete review remains available.
6. Triathlon bricks are deliberately not inferred from a source-content review; their own review remains required.

## Independent local verification

- `npx vitest run`: **441 files passed; 3,782 tests passed, 1 skipped, 6 todo**.
- `npx vitest run src/lib/det src/lib/plan src/components/plan`: **897 passed, 6 todo** at the focused checkpoint.
- V35/V359/V360 experimental contracts: **16 files, 116 tests passed**.
- New library review tests cover absent/withdrawn/stale/wrong-owner reviews, changed manifests,
  absence of athlete clearance, preserved exclusions, no automatic UI review, and missing schema.
- TypeScript and application build are checked locally; release declaration is regenerated with
  `attested:false` and `deploymentAttested:false`. A source declaration is never a deployment attestation.
- General-suite reconciliation: the race-goal guard now recognizes the append-only saver boundary
  and still checks saved secondary goals; the counting matrix uses the exact QA reference
  (`82897e56…`). Case count, blocked IDs and catalogue alerts match the previous reference exactly.
- GitHub CI runs on this draft are a separate proof, to be inspected after upload.

## Acceptance matrix: never combine reduced and full-profile tests

| Shared page pipeline, synthetic records and synthetic source reviews | Status |
|---|---|
| Semi 8 weeks / 6 hours | Accepted, 8 complete weeks; memory save/reopen |
| Marathon 16 weeks / 7 hours, app priorities Durabilité then TTE | Accepted with its distinct V403 audit; raw priorities retained |
| 70.3 12 weeks / 9 hours, complete app profile | Refused: week-1 brick requires >=140 minutes; none of the reviewed candidates fits |
| Semi 30 weeks | Refused at last family bench: periodization/load pattern |
| IM 16 weeks / 13–14 hours | Refused at last family bench: bounded search/polarization or empty slot |
| Other PR454 groups (10 km, short tri, cycling, swimming, multi-goal, constraints, trails) | Synthetic reference benches exist; complete coach integration not demonstrated |

Manual reduced-input 70.3 tests still accept 9/9.5/10 hours. They are **not** evidence that the complete-profile route accepts.
The 18 PR454 groups are 31 synthetic calendars / 468 weeks, not 18 sports or scientific attestation.

## Remaining before a usable product

- Finish unsupported/refused complete-profile families without dropping limiters or weakening checks.
- Review/install the isolated library-review SQL and exercise real owner/RLS/readback/withdrawal paths.
- Browser test of generation, correction, append-only save and identical reopen in the coach's own session.
- Real human sporting review. Neither test fixtures nor the new source-content receipt can replace it.
- Exact marked Nolio payload preparation and permitted real verification; old unmarked 75/75 receipts cannot be reused.
- Review the transfer patch, obtain explicit final deployment authorization, then test the integrated production version.

No production/main merge, publication or sporting permission is granted by this candidate.
