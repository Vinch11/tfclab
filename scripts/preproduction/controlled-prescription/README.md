# Offline correction preparation

These modules and candidate patch are not imported by the running application
or by either generation function. No deployment, model call or database write
is involved. Tests import the modules directly through Vitest.

`prescription.ts` requires explicit decision-engine stimulus/domain and allowed
candidate IDs. It does not infer stimulus from generic layout roles. It chooses
a compatible minimum dose, respects approved prerequisites/special contexts,
weekly frequency and budget, and rejects model-authored prescription fields.
Numeric variants which dilute the original stimulus are refused pending an
explicit separate validated stimulus decision. This conservative rule is not a
claim that all numeric durations preserve a complete protocol clinically.

`contractScope.ts` retains the full global report and maps local window evidence.
The candidate patch keeps the global report on window failure, adds a separate
window label, and displays week-specific objectives. It is NOT applied.

## Remaining work requiring coordinated deployment authorization

- Apply and test the candidate hook/panel patch with local fixture browser flows.
- Connect decision-engine stimulus/domain assignments, catalogue ranking and
  exact protocols to the offline selector, including whole-plan events,
  taper/recovery, spacing and diversity across windows.
- Support declared race and LCW stages as deterministic event prescriptions,
  never as invented catalogue sessions. Preserve trail-specific paths and
  bike/swim maintenance in intermediate run cycles.
- Change both functions to consume server-validated prescriptions and request
  only referenced explanations through a small structured gateway schema.
- Test HTTP-400 behavior with mocked gateway and enforce reference hydration.
- Run full sporting validators after hydration and complete assembly, retaining
  coach-load blocking and existing save rules. Do not replace these with the
  mechanical `assertCompleteWeeks` assertion.
- Refresh release markers, deploy test then main function only with explicit
  authorization; publish the frontend separately only when authorized.

The seven objective tests use generic compatible base fixtures, not complete
sport-specific plans. They do not validate LCW, trail prescriptions, race dates,
training quality or a real AI generation. No live bug is claimed fixed here.