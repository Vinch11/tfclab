# Saved V3 RPE object order

The saved 34 min 30 s V3P_SWIM_211 prescription has the original source
fingerprint, title, blocks, RPE values and configured duration. PostgreSQL JSONB
returns an RPE object as max/min whereas the catalogue constructs min/max.
The dose-integrity audit used JSON.stringify for that object and falsely reported
v3_source_or_dose_mismatch after reopening an otherwise intact saved plan.

The audit now uses the existing canonical JSON comparison for RPE objects,
keeping an absent object distinct from a supplied object. Different numeric
values, extra keys, missing bounds, nulls, changed source fingerprints,
dose/count/rest/labels, review metadata and block/array order still fail.
No plan blocks, targets, source fingerprints, scientific/source approvals,
stored plan versions, operation keys or Nolio receipts are rewritten.

91 focused tests pass across JSONB-roundtrip regressions, complete sources and
app-profile generation. The regression covers all 22 complete swim/strength
sources and negative RPE/source/dose cases. A read-only revalidation of the saved
12-week QA plan checks all 118 calendar rows (95 non-rest sessions), with zero
catalogue issues. The private saved data is not included in repository fixtures.

The coach's screenshot independently shows 101/101 calendar activities checked
with no previous-version conflict and no send. This is read-only calendar
reconciliation, not evidence of completed provider delivery. Resume the same
saved version after frontend/backend release synchronization; final unique
provider readback is still required for complete delivery.
