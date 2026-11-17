# Assessment contracts

- Keep assessment result availability in `assessmentContract` and session previews sourced from the existing normalised Days. Why: recorded bilan results and printed/exported protocols must not diverge.
- Critical-speed timed trials are a documented field adaptation, not certification of laboratory equivalence; keep their source/version and coach review separate. Why: a structured prescription does not prove an effort was maximal or completed.
- Do not route new assessment exports through destructive slot-based plan replacement without dedicated identity, stored athlete-link validation and readback. Why: tests must not overwrite coach-edited workouts or other plans.
- Critical-speed test entry uses `criticalSpeedResults`, saves only the running key on the reference snapshot and verifies readback; stored Nolio PAR records remain unconfirmed. Why: records must not certify tests or overwrite cycling data.