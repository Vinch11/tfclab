# Guided active-recovery prescriptions

The coach explicitly requested watch guidance, accepted positive execution ranges instead of a ceiling-only target, and specified that the fictional app athlete is linked to a real Nolio athlete. Consequently, no Nolio physiological setting, zone, metric or recipient identity is changed to fit the fictitious profile.

## Change at generation, not during export

`tfclDoctrine.ts` now distinguishes the recovery domain's physiological/model classification envelope (still zero to 55% FTP in cycling, zero to 75% threshold speed in running) from a programming execution band for active movement. The candidate V3 resolver uses 40–55% of the app athlete's FTP for bike recovery, and 50–75% of the app athlete's threshold running speed for running recovery. For 300 W FTP this is 120–165 W; for a 240 s/km threshold the running range is 320–480 s/km. These are explicit coaching defaults, with model confidence, not measured LT1 or independently validated individual prescriptions. They apply to active-recovery prescriptions, including warmup and cooldown, rather than redefining a zone or interval rest.

The source for the recovery ceiling is Andrew Coggan's primary description of active recovery below approximately 55% FTP: https://www.trainingpeaks.com/blog/power-training-levels/. That source does **not** establish the positive 40% bike or 50% running execution floors: those are the separately identified TFCL programming choices authorized by the coach's requested change. Do not describe them as new measured thresholds.

The resolver remains anchor-dependent: no FTP, running threshold or swimming pace is synthesized. Direct individual/sprint/terrain targets, main MLSS ranges, swim policies, doses, rests and repetitions are unchanged. Rendered text and serialized source blocks consume the same resolved targets. The Nolio mapper remains source-faithful; no number-string trick, replacement recipient zone, scalar-ceiling equivalence or silent export-time target change is introduced.

## Existing plans and activities

Archived versions remain immutable. An old 0–165 W prescription is not relabelled as a new 120–165 W prescription in a receipt, payload or historical source. The normal dialog identifies retired model recovery guidance and stops a new export of that old archive before provider calls, with a regeneration instruction; read-only verification remains available. This guard is not a cross-version reconciliation system.

No old provider workout has been repaired, deleted or resent, and no provider settings have been changed. A newly generated version must **not** be blindly exported over the same dates as an earlier test: its new identity does not deduplicate earlier-version activities. Repair/replacement of those prior remote activities remains an explicit unresolved step. Do not claim end-to-end export completion or automatic repair of the existing QA plan.

## Validation

The focused application tests cover the common source proposal and native serialization, 70.3 at 9/9.5/10 hours, Ironman, semi and marathon (including long horizons), source references, complete strength/swim supplements, exact readback/transport and the coach controller. The dedicated experimental family acceptance and trail safety suites are also run with the experimental Vitest configuration. These checks are synthetic engineering evidence, not real Nolio delivery or independent sporting approval.

The new regression confirms the reported bike source retains the main 285–309 W target while both 10-minute warmup and 8-minute cooldown use 120–165 W; the original source doses/catalogue blocks remain unchanged. Other FTP anchors produce different ranges. Running gains finite recovery pace bounds without inferring a swimming pace from CSS. Physiological classification boundaries retain zero-based recovery. All positive targets still require an actual Nolio readback before claiming delivery or device compatibility.
