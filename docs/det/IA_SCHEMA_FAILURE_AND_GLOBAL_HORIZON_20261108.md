# IA generation incident — 8 November 2026

## Real evidence, before another generation

The coach reported failure of the normal IA marathon generation and a12-week
progress display despite a16-week configured horizon. Read-only Cloud stats
confirm two JSON failures at13:28:13.770 and13:31:50.386UTC, approximately92s
each, three chunks/twelve weeks per failed HTTP request and two schema attempts.
Neither credits exhaustion nor rate limiting is reported by these records.

Existing native edge logs identify chunk0, finishReason stop, source-contract
Zod errors on sessions[].catalogId: catalogue_physiological_intent, plus one
catalogue_duration error. The final available failure is13:31:50UTC. No raw
athlete/model content was retrieved. The gateway had rejected json_schema and
fallen back to json_object (constrained:false). A strategic recap was dropped
after canonicalization. Logs do not identify a more specific gateway400 reason
or prove which global HTTP window was running; the window behavior is verified
separately by the real client-hook test.

## Corrections built on the current IA implementation

1. Keep local HTTP window counts for server requests, but project every progress
   update into the full generation horizon. A16-week marathon requestsS1–S12
   thenS13–S16, and displays/16 with four global chunks throughout. A short
   direct generation remains unchanged. Scope is cleared on completion/reset.
2. Resolve the existing QA JSON setting BEFORE deciding whether to split into
   windows. It was previously forced only inside generatePlan, after the
   windowing decision could already take the single-request path.
3. Explain catalogue identity in the initial model prompt. On the SAME existing
   single schema retry, supply source facts for the specific rejected session:
   exact title, sport, intent, duration bounds, zones, protocol and permitted
   variants, with its array path and real week number. No source/title/dose is
   automatically substituted. Incompatible responses remain rejected by the
   unchanged validators; no switch to Markdown, arbitrary custom session or
   relaxed scientific/sporting check is introduced.
4. Apply the identical generator change to ai-training-plan and its test copy.

## Offline checks

The actual React generation hook is exercised with mock authentication and HTTP,
never a real token or paid model call. With QA JSON enabled but no caller format
flag, its first request has12 local weeks/globalTotalWeeks16, while public
progress displays16/four chunks. A synthetic SCHEMA_FAIL stops the sequence
without installing a partial plan or starting the second HTTP request.

Five selected frontend suites pass:39 tests, including windowing, prevalidation,
legacy diagnostic parity, source-feedback integrity and the actual hook.
App TypeScript and build/PWA pass. Changed-file lint has the same six preexisting
no-explicit-any errors as baseline and zero new warnings/errors; no rule disabled.
Mocked Deno tests exercise the actual generator retry with the source contract:
the bad selection remains rejected, and only a regenerated consistent response
is accepted. They must pass in QA before deployment; no live generation success
is claimed by these mocked tests.

The comparative Nolio diagnostic work is paused in a separate local git branch.
It is not part of this IA repair or its QA deployment. Existing saved plans and
the original101-activity Nolio delivery are preserved. A real IA generation
after the repair remains an external acceptance step, not a mocked-test result.
