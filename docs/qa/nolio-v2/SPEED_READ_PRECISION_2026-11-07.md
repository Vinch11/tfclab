# Speed read precision and coach pace display

The authenticated screenshot for S1-J2-4 shows intact bounds and units on all three raw m/s targets, with provider values at two decimal places: 2.0833333333333335–3.125 becomes 2.08–3.12 and 4.042037186742118–4.291845493562231 becomes 4.04–4.29. This differs from the earlier lost-ceiling problem: no bound disappears. The hundredth-m/s read precision is observed evidence from this response, not a precision guarantee declared by the OpenAPI schema.

## Directional comparison

Only raw m/s target values within workout `targets` (including nested steps and exercise sets) are eligible. After the existing numeric-string normalization, each read value must be finite, strictly positive, actually lie on the 0.01 m/s grid, and be within 0.005 m/s of its sent bound, allowing floating-point machine epsilon. At an exact halfway value either nearest-cent tie is accepted; the observed 3.125 to 3.12 does not justify assuming a particular server implementation for all ties.

The read representation is aligned to the original source value for comparison only. Sent bodies, source targets, pace precision, operation keys, payload/plan hashes, existing ledger entries and receipts are not rewritten. The general numeric tolerance is unchanged. Watts, doses, distance, time, RPE, audience, dates, marker/description, units, missing bounds, inverted or collapsed ranges, repeat count and trailing-rest rules retain their existing checks. A more precise changed value that is not on the provider read grid does not benefit from this rule. Errors larger than half the read quantum remain refusals.

This recognizes equality at the observed provider read precision; it is not a claim that every displayed digit is preserved by Nolio. At the recovery values in this example the read representation corresponds to approximately 5:20.51–8:00.77 per km versus the source's 5:20–8:00 per km. The source prescription is unchanged.

## Presentation

Running coach diagnostic messages use min/km, identified by the operation's server coverage sport, rather than exposing m/s floats. Other sports retain their own existing diagnostics; a swim speed is not labelled as a running pace. The common coach prescription text already formats source running pace values per km. API speed quantities remain in m/s for existing saved versions, so this update does not invalidate or re-create their operations. Device/native Nolio unit preferences are not changed or asserted verified by this display fix.

## Verification and limits

85 focused tests pass, including the exact reported three-block shape, read-only real reconciliation path with injected fetch, both nearest-cent tie outcomes, off-grid/changed speeds, unchanged body inputs, watts and non-target quantities, collapsed/missing/inverted bounds, metadata/recipient/recovery checks, running min/km rendering and propagation through the actual coach controller. App TypeScript, ESLint and the actual local Deno check of the shared planned client are also checked. No private Nolio call is made by development; the synthetic test is not a live receipt.

After the synchronized QA deployment, the coach can reload and verify the same saved version without regenerating or deleting anything. If prior operations verify, the normal Export action resumes the remaining batches. Full 12-week delivery still requires actual authenticated verification through the final operation; this patch alone is not that evidence.
