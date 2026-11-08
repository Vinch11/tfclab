# Recreated resources need current-resource receipts

The coach completed week 12 with 10/10 activities verified. A read-only audit
then counted 101 latest exact-unique receipts and 101 acknowledged operations,
but joining them exposed 83 resource-ID differences. All 83 receipts predated
their corresponding audited recreation and referenced the deleted resource ID.
Their payloads still matched: plan/body/operation identity alone could not
invalidate an obsolete successful receipt. No full-plan delivery claim is made
from that stale aggregate, and the valid week-12 result is retained.

The owned-plan verify endpoint now reloads the existing operation ledger after
its verification batch, including any lost-ack reconciliation. It projects only
the selected manifest's index, session, path, payload hash, current state and
acknowledged resource ID. Authentication, plan/athlete ownership and service-role
boundaries are unchanged; no new table grant, history or credential is exposed.

The coach callback supplies those bindings to the independently read durable
receipts. Counting requires an exact current resource ID, confirmed ledger state
and matching body, as well as all prior owner/version/context/unique-read checks.
A missing, incomplete, duplicate or divergent binding snapshot fails closed.
Old receipts stay append-only. A changed resource ID cannot jump progress past
activities that still require a current read. No session is sent, recreated,
deleted, moved or rewritten by this correction.

Thirteen regression tests fail before correction, including a 101-activity case
with 83 replaced resources and a controller integration that previously skipped
its second read batch. Afterwards 159 tests in eleven focused suites pass; 35
additional durable/mapper/endpoint guard tests pass. App TypeScript and lint
pass. Build, QA deployment and the eventual new real readback are recorded in
the PR. The final full-plan check must use read-only verification, not Export.
