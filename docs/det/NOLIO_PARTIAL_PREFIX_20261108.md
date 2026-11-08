# Resume an acknowledged prefix smaller than one verification batch

The user's week-12 selection contains ten activities. The durable ledger has
five confirmed activities; the other five have not yet been attempted. The
provider verification endpoint returns at most eight results per read. During
the first five-activity prefix check, that batch also contains three explicit
not_sent results for the future send phase. The controller treated them as a
failure of its already-sent prefix, preventing it from sending the remaining
activities. Scope selection preserves per-operation identities.

Four regressions reproduce the failure before correction with acknowledged
prefix lengths 1, 5, 7 and 9 in a selection of ten. The controller now recognizes
only an explicit not_sent in the known frozen manifest, within the requested
server batch and beyond the current verification target, as an expected future
operation. The normal sender then handles the remainder through unchanged
simulation, conflict checks, durable claim, bounded POST and exact readback.

A not_sent within the prior target still stops. Read-only verification targets
the full selection and still reports its first unsent activity without posting.
Absent, ambiguous, unknown, divergent, malformed and out-of-window results are
not ignored. An unknown result cannot be retried past its target or hidden by a
stored count already reaching that target. Creation retries remain unchanged.
No endpoint, provider contract, saved body, operation key, source or date is
modified by this correction. The shared server batch constant bounds the tail.

Validation: four tests failed with the original controller; after correction,
all 132 tests across the ten focused suites pass. App/Vite TypeScript and lint
pass. Build and isolated QA deployment are recorded in the pull request when
completed. A test does not establish delivery of the remaining five activities.
