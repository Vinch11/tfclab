# Normal-plan acceptance — 8 November 2026

## Scope and existing foundation

Follow-up to the completed original QA_DET_A delivery. Build on the existing
IA planning pipeline, shared frozen profile/limiter order, effective ambition,
calendar, common plan viewer, append-only history and Nolio export controller.
No new planner, source approval or diagnostic is introduced.

`src/lib/det/__tests__/normalPlanAcceptance.test.ts` uses synthetic athlete
records through the REAL normal pipeline and normal app-profile generator.
Network access is explicitly forbidden. IA is not called or purchased. The
transport-specific `_outputFormat` field is excluded using the existing semantic
comparison, rather than modifying either engine's physiological inputs.

## Observed matrix

| Synthetic case | Result | Weeks | Nolio operations prepared | Distinct source IDs | Imported components |
| --- | --- | ---: | ---: | ---: | ---: |
| 70.3, FTP 210 W, threshold 300 s/km | Constructed | 12 | 103 | 40 | 5 |
| 70.3, FTP 300 W, threshold 240 s/km | Constructed | 12 | 103 | 47 | 5 |
| Semi, light level, age-group ambition | Refused: no compatible quality source | — | 0 | — | — |
| Semi, same light profile, explicit finisher ambition | Constructed | 8 | 38 | 21 | 4 |
| Semi, trained level | Constructed | 8 | 38 | 25 | 6 |
| 10 km, no diagnostic priority | Refused: no priority invented | — | 0 | — | — |
| 10 km, recorded synthetic TTE 25 min | Constructed | 8 | 38 | 26 | 2 |
| Marathon | Constructed | 16 | 75 | 39 | 20 |

These counts describe these new offline fixtures, not the original 101-activity
archive and not real provider creations. Unique source counts do not certify
training diversity, limiter dose coverage, safety or adaptation independently.

All eight cases pass. The constructed plans preserve the original frozen
fingerprint and limiter order, source minimum level, configured dose integrity,
saved preparation timeline and identical whole-plan/scoped operation hashes.
Every mapped target passes the shared mapper's semantic checks. Running targets
use /km rather than m/s; power targets retain the source's individual FTP values
(including the 210 W regression). Exact readback is tested locally and is NOT
represented as an actual provider receipt. Timed qualitative swimming remains
qualitative when domain-specific pace data are absent; CSS does not invent it.

## One bounded runtime correction

The light-level age-group case previously fell through to an opaque generic
search failure. The existing solver already proved there was no quality
candidate (`qualitySuffix[0]` false). It now returns the explicit
`v3_quality_source_unavailable` refusal before the same futile search, naming
level/restrictions/phase and unsatisfied ambition. No source level, ambition,
limiter, dose, budget, polarization or approval gate is changed. In particular,
the successful finisher case requires an EXPLICIT different form choice.

## Technical verification

- Existing DET/Nolio/input/dispatch suites: 690 tests across 45 files passed.
- New normal-plan matrix: eight cases passed (six constructions, two refusals).
- After the bounded refusal correction: 145 tests across eight selected suites
  passed, including normal proposal construction, source selection, legacy IA
  parity, form retention, append-only archive durability and Nolio dialog. These
  suites overlap the baseline; their counts must not be added as unique tests.
- Onboarding/authentication focus retention: five tests across two suites passed.
- App TypeScript and changed-file ESLint pass. The generated source declaration
  is fresh; it is not a deployment attestation.

The source-only candidate does not replace the deployed QA release. No additional
Lovable agent invocation or private Nolio action was needed for this audit.

## Completed prior delivery evidence

Original immutable version: `508e9d79-11e6-8d22-9939-585728d1c6a0`.
Read-only join after the coach's final whole-plan check: 101 matching operations,
101 distinct provider resources, six bike legs, six run legs and
`ledger_and_exact_readback_match=true`. Every latest receipt agrees with the
CURRENT acknowledged resource/body, not the deleted predecessor. No SQL writes
or Nolio sends were performed to obtain this evidence.

## Remaining external acceptance

1. In the authenticated normal coach flow, generate a NEW plan with pace-v1
   from the existing profile. Preserve the delivered archive. Use available
   dates and let the normal calendar-conflict gate decide before any creation.
   The normal deliberate Export action runs the existing provider dry-run gate
   before sends; a read-only verification action on an unsent plan cannot
   replace this gate. No new technical questionnaire is required.
2. Observe actual provider acceptance of fractional pace strings and exact
   relecture of the new activities. Offline identity checks cannot prove this.
3. Physically inspect representative bike/run/swim workouts on the coach's
   watch: warmup target range, main repetitions, intervening recovery, last
   recovery handling and cooldown. Keep an absent numerical swim target absent.
4. Human sporting review of representative plan doses/progression/recovery and
   source content remains unperformed. Engineering registry counts are not
   scientific approval. Address the light/competitive source gap with genuine
   compatible source prescriptions, not a relabelled advanced workout.
5. Integrate only after the candidate changes to existing production files are
   reviewed and final checks pass. Production main and publication are unchanged.

The signed-in preview cannot be operated by this agent because its URL was
explicitly rejected by browser policy. No alternate surface or borrowed
authentication is used. Watch hardware is likewise unavailable. These are
concrete acceptance dependencies, not checks reported as completed.
