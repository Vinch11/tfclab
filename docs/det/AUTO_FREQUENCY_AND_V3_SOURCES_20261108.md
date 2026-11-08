# Auto frequency and imported V3 source availability

The coach supplied a normal-page transcript: Marathon, 16 weeks, Auto weekly
hours/frequency, two strength sessions, trained level and competitor ambition.
The shared summary displayed `— séances` and DET refused the missing frequency.
The old 12-week saved plan remained underneath. It was not a generated 16-week
plan; its original delivery/receipts must remain unchanged.

## Cause and correction

IA deliberately leaves `config.sessionsPerWeek` undefined for Auto. Its existing
`prepareGenerationContracts` resolves the actual per-week sport slots, including
recovery/taper/race changes. DET incorrectly required a positive integer before
using that common calendar. It now accepts undefined ONLY as Auto, retaining
rejection of explicit zero, negative, fractional, nonfinite and null values.
The summary labels Auto rather than presenting missing data. No fixed frequency
is written into the frozen config and no second sizing matrix is introduced.

With that guard fixed, a full 16-week competitor fixture reached a real source
shortage at week 15. The existing native pool could not assign distinct
compatible sources to every taper slot, although suitable imported V3 candidates
existed. Previously imports participated mainly as exact-dose substitutions
AFTER solving, so they could not fill this domain during assembly.

The normal app-profile proposal now proves a distinct-source shortage by
bipartite matching for single-component slots. Only when such a shortage or an
empty slot domain exists does it expand the existing pool with the already
context-filtered imported candidates. Phase, sport, minimum level, source
engineering status, negative restrictions, required slot doses, maximum slot
durations, recovery, uniqueness, budgets, progression and polarization remain
enforced by the SAME solver. Bricks are not reduced to a single-source matching
problem. Qualified reviewed family pools and the original 800 sources are intact.

All 920 rewrites remain accounted for: 661 ordinary engineering candidates,
165 blocked ordinary sources and 94 specialist records. Registration/selection
does not grant scientific approval. Blocked/specialist records are not injected
as ordinary workouts. This is a bounded real use of V3 candidates in assembly,
not merely a count of registered IDs or a relaxed sporting gate.

## Observed verification

Before expansion: the normal Auto marathon fixture was refused at S15. After
correction: 16 weeks, 105 prepared activities, 104 source components, 45 distinct
source IDs and 28 component uses from the rewritten cohort. Normal server-side
coach/source/cache checks and Nolio preparation accept its structural integrity;
no provider call or actual receipt is implied by the offline test.

The regression matrix also covers the unchanged explicit-frequency plans,
finite individual targets and scopes, while checking that missing limiter and
quality-source cases remain refused. Auto-calendar parity covers marathon,
semi, 10 km, 70.3 and IM with synthetic explicit TTE priority (a frequency
isolation fixture, not a substituted real diagnostic). Full normal-generation
coverage in this change is marathon, semi, 10 km and 70.3. Trail generation
and physical watch guidance are not claimed by these fixtures.

Local targeted verification: 118 tests / seven suites passed, app TypeScript,
changed-file lint and build/PWA passed. A subsequent focused Auto marathon run
also passes the real coachPlanProblems/nativeCoachPlanProblems checks. The
source declaration is fresh. External authenticated pace-v1 acceptance and
physical watch checks remain separate; the original delivered 101-activity
archive is not regenerated, rewritten or resent by this patch.
