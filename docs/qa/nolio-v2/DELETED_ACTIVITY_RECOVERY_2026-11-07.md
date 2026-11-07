# Explicit recreation after confirmed provider deletion

The saved test plan had earlier acknowledged operations. The latest authenticated
verification now reports its first operation absent. A clear previous-version
conflict scan does not prove that same-version acknowledged activities still
exist. The regular sender correctly stops instead of silently appending more
activities or pretending the missing activity remains delivered.

The normal IA/DET journey has one Export action. Technical verification,
calendar reconciliation, missing-activity inspection and continuation run
automatically. Diagnostic tools stay in collapsed advanced options. Only a
confirmed deletion prompts a single contextual decision to recreate the exact
dated activity list and continue. Inspection reads the acknowledged resource by its original ID,
under the same provider athlete. A 200 response with a different date or content
means moved/edited and blocks recreation. Any authorization, rate-limit, network,
timeout or unreadable response is unknown. Only a direct 404 together with a
complete absent calendar reconciliation can offer recreation. A surviving marked
copy, partial pagination or an uncertain/unacknowledged prior send also blocks it.

The coach reviews the exact dated list and clicks to recreate those activities
and continue. The decision binds the prior resource, original operation key,
source body and current plan/ref/operation digests. The server repeats both reads
and the cross-version calendar check under the provider-calendar lease, applies
the ordinary source/simulation/consent/ownership gates, and atomically records an
append-only audit of the old ledger before reserving one new POST. No receipt is
fabricated. A lost recreation response stays unconfirmed and cannot be recreated
again automatically; ordinary unique readback must reconcile it. An already
present/moved/edited activity is never deleted or overwritten by this flow.

The source plan/version, prescriptions, dates, origin marker and operation key
remain the same. Only the explicitly recreated operation's mutable transport
state/resource advances; its full prior ledger and all earlier receipts survive.
After recreation, ordinary current-calendar verification and bounded export
resume. No new plan generation, blanket ledger reset or forced success is used.

Validation: 129 focused injected-transport, controller, dialog, calendar-lease
and durable-sender tests pass. Nine PostgreSQL ACL/CAS/history/consent/lease and
uncertainty assertions pass inside a rolled-back synthetic transaction. These
tests and source preparation make no real Nolio calls. Actual deletion inspection,
recreation consent and final unique delivery remain authenticated coach actions.
