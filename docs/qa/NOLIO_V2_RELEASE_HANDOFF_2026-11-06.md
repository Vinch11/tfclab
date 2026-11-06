# Nolio V2: concrete release handoff

## Delivered and locally checked

The existing common plan viewer retains whole-plan, week/range and single/multiple-session exports. Normal DET 70.3 bricks now have an explicit preparation action: preserve exact bike/run prescriptions, choose transition and schedule, append/read back a new owned version, and export as two linked activities. Full-plan review and simulations target that exact version. Original versions and source/provenance are preserved.

201 tests in 19 files passed; an additional common-dialog regression verifies switching to the exact newly saved preparation version. A normally generated 12-week 70.3 including strength, all prepared bricks and its declared competition passes the actual shared V2 converter with zero refusals. Scope overlap preserves per-operation bodies and durable identities. This is engineering evidence; no provider delivery or actual sporting authorization is asserted.

## Correct deployment target

Use the isolated Lovable QA project `c3941303-40d2-447e-9b87-867d82727fd1`, backend `lkjesdacgpolrwfxulbo`, and its synchronized private QA repository `Vinch11/vlamax-cycler-pro`. The public candidate repository has a different source manifest because environment overlays differ. Do not deploy the public manifest onto the QA backend. Do not publish or modify production as part of this handoff.

The deployment operator must deploy the exact synchronized QA sources and their shared dependencies for:

- `nolio-v2-plan-dry-run`
- `nolio-v2-send-plan`
- `nolio-v2-oauth` (changed shared mapping validation)
- `qa-plan-coach-review` (owned QA-account access)

No new database migration was introduced by these two finalization commits. Existing review, ledger, reference, dry-run and verification tables/RPCs remain required. No grant/token or account role should be changed merely to deploy code.

Read the exact `releaseId` and `components['det-engine']` from the QA repository's generated `supabase/functions/_shared/planReleaseManifest.ts` at deployment. Through an authenticated owned saved version, both export endpoints' `action: 'capabilities'` must report the same release and `tfcl.nolio-scoped-export.v2`. A successful frontend preview build does not prove this deployment.

## Actual release authority

Sending remains denied without a real externally authorized sporting release, an ordinary accepted review of the exact owned complete plan, matching dry-run receipts and explicit export consent. The code cannot supply these human decisions.

If an authorized reviewer approves this exact source release, the deployment operator may install their trusted raw Ed25519 public key (base64url) as `NOLIO_V2_SPORTING_RELEASE_PUBLIC_KEY` and the corresponding signed envelope as `NOLIO_V2_SPORTING_RELEASE_PROOF`. `sportingRelease.ts` defines the exact strict schema and canonical serialization. Its release ID, engine hash, allowed mode, expiry and evidence SHA must match the real approval. Do not reuse ephemeral unit-test keys, a synthetic reviewer, a fabricated evidence hash or an old release. These configuration values were not created or installed by this change.

## Final provider acceptance, owned fictitious QA athlete only

1. Regenerate a plan against the deployed QA source release; use the existing common archive saver and reopen the exact saved version.
2. In Exporter vers Nolio, read the saved version, prepare its training bricks with explicitly confirmed schedule/transition, and retain the returned new history version. Existing confirmed clocks cannot be silently changed.
3. Confirm actual sport/exercise references, calendar timezone and declared competition against provider-owned opaque IDs. No guessed identifiers.
4. Perform and save ordinary full-plan coach review on that exact new version. This does not provide sporting/scientific release authority.
5. Precheck one chosen session. Simulate with V2 `dry_run`; confirm all matching job/receipt readbacks. No activity has been created by simulation.
6. Only with real release authority and deliberate consent, send the chosen session once. For a brick expect exactly two linked activities and a neutral transition gap. Verify exact unique provider detail readbacks; an acknowledged create ID is insufficient.
7. Select its week, then the whole plan, retaining the same saved version and references. Simulate each selection and explicitly consent. The durable ledger must preserve overlapping operation identities and prevent duplicate creation. Stop on uncertainty; verify without resending.
8. Final acceptance requires every expected operation uniquely verified, all rests explicitly excluded, zero refused sources and exact competition identity. Compare the readable screen/PDF against saved prescriptions. Test reloading and history reopening without losing the saved version.

No existing Nolio calendar entry should be removed as part of acceptance. No real athlete training calendar should be used to substitute for this fictitious QA trial.

## Current access limitation

The Lovable connector exposes frontend publication and SQL, but no dedicated individual Edge Function deployment action. The direct Lovable editor inspection was blocked by the cloud browser URL policy; no workaround was attempted. The Supabase plugin can deploy functions on accessible Supabase accounts, but access to this Lovable-managed backend through an external account has not been established. No paid Lovable AI request, production publication, real approval or provider send was performed. Deployment and actual acceptance therefore remain explicitly unverified.
