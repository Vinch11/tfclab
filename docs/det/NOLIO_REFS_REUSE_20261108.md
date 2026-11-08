# Nolio sport reference preflight — 8 November 2026

The latest user export stopped before creation while loading official sports.
Read-only QA metadata shows an active grant, idle refresh state, a time-valid
token and recently loaded official refs. This does not identify the provider
HTTP error: the former sports reader collapsed all non-200 replies to unknown,
and the interface discarded the returned reason.

Normal export previously forced load_refs before every precheck whenever the
full plan contained a declared triathlon, even for scoped selections and when
the server already had exact, fresh, unique official refs for that athlete.

The coach flow now performs its ordinary server precheck first. The existing
server freshness, selected-athlete and exact-unique-sport checks are unchanged.
Only a matching plan hash with sport_reference_missing:brick can invoke the
declared-competition refs callback once. A fresh complete server precheck is
still mandatory afterwards. Other blockers, failed reads or context changes do
not trigger a loop, another token refresh or any creation. No archive, dose,
scope, operation identity, cached-ref lifetime or authorization gate is changed.

Sports GET failures distinguish authorization (401/403), rate limits (429) and
provider errors (5xx) as safe categories, with no response content or token.
Exercise-library failures retain their existing loaded/unknown/partial/timeout
contract. Unknown results never become valid refs. The interface uses an
allowlist of coach-facing failure messages rather than echoing provider text.

The local executor became unavailable before validation. The earlier draft
edits in scratch are not evidence of a tested or deployed fix. The committed
candidate must pass targeted tests, TypeScript, lint, source declaration checks
and the QA build before deployment. A provider acknowledgement does not prove
delivery. The prior 96/101 confirmed activities and the five remaining
activities still require the normal final readback.

Validation executed in the QA runtime after local executor failure: 120 tests,
10 suites passed; changed runtime/test lint and five Deno checks passed. Both
source declarations generated and checked fresh. QA automatic build reports
build OK. Distinct manual app/Vite TypeScript and PWA builds were unavailable
under that runtime's command policy; no deployment was performed at this step.
Public CI must supply the separate typecheck evidence before deployment.
QA auto-committed only its generated manifest at
83061fa369d87fd262ccfa20ad78e2db6b86f21c, release
53842a07ff4945ae13285bb9e94e17d14afbbf15bcf4683f51821da682a16baf.
