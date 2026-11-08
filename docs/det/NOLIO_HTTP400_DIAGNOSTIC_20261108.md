# Known Nolio HTTP400 simulation refusal

The coach generated a new 16-week plan and reported only “refus Nolio présent”.
Read-only QA evidence identifies version79443611-6c71-8b24-aaaa-214daadeafd9,
jobbf82d954-d198-4a60-b3e8-2834432b2927: 103 operations, first operation
S1-J1-1 / 10 November2026, outcome REFUSED, code validation_rejected_400.
This was a dry-run refusal, not an acknowledged create or delivery.

The first saved prescription is V3P_RUN_136, 51minutes: 10min recovery,
4×6min threshold with3×3min recovery, 8min cooldown. Source targets are
233–247.4sec/km and320–480sec/km. The saved plan uses pace-v1. These values
are facts; the fractional friendly pace as the cause is still a hypothesis.
A fresh anonymous official OpenAPI retrieval confirms raw number|string values
and friendly /km strings, with m:ss examples, but does NOT prove provider
acceptance of fractional seconds. No rounding or mapper change is made here.

The original response body was intentionally not stored, so the exact field
cannot be recovered from its durable receipt. The new diagnostic repeats ONLY
the same known-400 body's forced dry-run, once after the coach's next deliberate
Export action. It requires the same owned job/plan/refs/manifest/body, a complete
precheck and an exclusive job lease. It does not retry unknown/auth/quota
outcomes, create or erase receipts, change the creation ledger or confer send
authority. No new resource can be created through this diagnostic transport.

Only allowlisted schema field paths and fixed reason categories are returned
ephemerally to the authenticated caller. Provider messages/values, athlete/team
names, tokens and arbitrary keys are discarded. The browser revalidates field
paths/reasons and binds the rejected index/key/date to the exact manifest. It
always stops before simulation confirmation or real sends. An isolated new
success is reported as diagnostic-only; it cannot clear the earlier refusal.

The actual HTTP400 cause remains to be observed through the coach's authenticated
browser. This patch improves diagnosis, not provider acceptance of the current
payload. The original 101-activity delivery remains intact. Its full global
frontend rerun finished:495files passed,4383tests passed,1skipped,6todo.

Diagnostic patch:140tests across five suites passed, including forced dry_run,
bound manifest, no UNKNOWN/auth/quota retry, no receipt promotion, privacy
projection and controller stop before creates. App TypeScript, changed-file
ESLint, production/PWA build and source-declaration freshness pass.
