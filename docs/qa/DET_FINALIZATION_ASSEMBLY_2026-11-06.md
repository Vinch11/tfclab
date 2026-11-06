# DET finalization — 2026-11-06

The simplified page still exposes a study with alternatives. It must not be called an assembled, validated plan.

This branch first fixes the opt-in native weekly-quality condition: it was restricted to triathlon despite its running final-validator requirement. Native activation slots can now be classified as key only from existing source intensity, without changing dose or placement. The pre-review native study remains non-attested, with human review required; the strict reviewed V3 flow remains separate.

Local probes before the workspace became unavailable:
- Semi 8 weeks / 6 h: complete candidate with no blocking final issue when native quality, deload and polarization guards were enabled.
- Marathon 16 weeks / 8 h: same result.
- 70.3 12 weeks / 10 h: still refused in base week 1. Native sources BRICK_STAGE1_INTRO (60–90 min) and BRICK_ACTIVATION_PRE_RACE (30–50 min) cannot fill the unchanged 140-minute long-brick floor.
- A proposed source-composition experiment was interrupted before execution and is NOT validated or deployed.

The local environment then disconnected. New branch verification is performed by GitHub Actions; no unfinished local experiment is deployed to QA. Source declaration is emitted as public source metadata, not deployment/scientific attestation. No AI calls, athlete changes, review writes or Nolio sends are authorized by this diagnostic workflow.

Remote CI on fc39d45f verified both native running candidates and the existing 33 real-app/real-engine tests. The next test is explicitly diagnostic only: a synthetic 180-minute base composition is inserted into the test's source domain to identify downstream 70.3 constraints. It is not a source admission, athlete default or runtime fallback. The composition is never imported by application code.

Remote search-order experiment on 33f974a: unchanged strict app integration 33/33 and native study 4/4 (including a diagnostic-only test). Native quality-first/easy-margin ordering constructs the entire synthetic 70.3 domain probe; final sport ratios correctly REFUSE it (swim42%, bike22%). It is not an accepted scenario and no application fallback is enabled.

Long-plan checks now use the ORIGINAL diagnostic priority for every recurring block, then apply the existing V408 exact configured-source rules to the saved structure. They do not assume TTE when that limiter is absent from the semi-marathon diagnostic. Repeats are expanded from saved chosen doses; no default library dose is reloaded.

Additional native diagnostics: Marathon40/9h constructs a candidate without hard final issues. Semi30/6h constructs but correctly refuses five consecutive non-deload weeks. These native studies are not the normal V3 coach flow and are not deployed.

The 70.3 final ratio diagnostics are the native validator's historical SESSION-COUNT ratios, not measured/planned minute shares. They cannot be relabeled as minute proof. The existing strict V3 path uses independently verified per-sport minutes and exact brick splits; no synthetic source from the study may replace that path.

Verified on 163e64f (GitHub Actions 42182299949): application TypeScript passed; 33/33 strict real-app/real-engine integrations passed, including repeated original-priority exact-dose checks on Semi30/Marathon40; native study 6/6 tests passed. A diagnostic test's execution is NOT a passing sports scenario. The final test cleanup makes the semi30 load-pattern refusal and 70.3 historical count-ratio refusal explicit assertions, and promotes native Marathon40 to the positive assembly checks.

Finalization is NOT reached. In particular, the simple UI is still a candidate study, not a selected complete V3 plan. Its replacement must construct from existing app inputs, retain unknown inputs and source-review status honestly, validate the whole plan, and connect to the same review/archive/reopen pathway. Neither legacy-native cards nor synthetic source-gap probes may silently replace V3 in the normal coach flow. All priorities retained in a calendar is not a claim that every possible limiter has a verified construction branch.
