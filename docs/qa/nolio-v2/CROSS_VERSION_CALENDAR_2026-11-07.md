# Reconcile regenerated plans before creating provider activities

Operation keys and origin markers are version-bound. They protect retries of
the same saved version; they do not by themselves prevent an old and a regenerated
version from creating activities on the same dates.

The normal coach export now scans the entire selected calendar in bounded batches
before simulation or creation. A separate read-only action exposes the same check
without consent, saving a changed visible plan, simulation, creation or delivery
claims. Only owned saved plan operations, official provider references and the
server's historical operation records are used. No client-supplied provider body,
resource ID or conflict waiver is accepted.

Every list page and resource detail is read. A foreign TFCLab origin marker or a
known older-version remote ID in the same provider sport/day blocks export, even
if the title, targets or description changed. Other current-version session
markers are recognized from the full saved version when exporting a smaller
scope. Unreadable/malformed/incomplete/paginated/deadline-limited reads are unknown,
never clearance. Diagnostics return only source session/date, a count and closed
reason codes. Plain manual activities without a known old ID/marker are not
classified as old TFCLab exports. Legacy unmarked activities outside this V2
ledger cannot be exhaustively identified by this check.

Before every new operation reservation, the server repeats the calendar read.
Attempted operations retain their existing ledger/receipt checks; uncertain
operations are never resent. Unresolved older-version operations without a
remote ID block a new version. A service-role-only PostgreSQL lease serializes
send requests for one coach/provider-athlete across versions and TFCLab athlete
records. Its 60-second expiry exceeds the endpoint's 35-second request deadline;
release is bound to the exact request UUID. A stale request cannot release a
replacement lease. A DB/RPC/lock failure fails closed before creation.

This feature does not delete, replace, relabel, adopt or mark old activities as
delivered. Present old test activities still need an explicit coach decision in
Nolio. Provider snapshots do not guarantee absence of later external edits.
No change to athlete zones, watts, paces, source prescriptions, operation hashes,
old ledger records, human reviews or sporting approval is made.

Validation: 97 focused injected-transport/controller/dialog/durable-sender tests
pass. Eight PostgreSQL ownership/ACL/lease assertions pass in a rolled-back
transaction against the QA database. Application TypeScript, changed-file
ESLint, release declaration and production build/PWA pass locally. Migration 0025 is installed on the QA backend with zero lock rows; client
execution is refused. Synchronized QA endpoints remain necessary before use. The
actual local Deno check of nolio-v2-send-plan also passes.

Live acceptance remains open: the development browser reaches the QA login page.
Stored POST acknowledgements and historical verification receipts do not prove a
complete current calendar. The authenticated coach must reconcile the current
saved version, resolve any displayed old-test conflict, and obtain the final
unique readback count through the last operation before declaring export complete.
