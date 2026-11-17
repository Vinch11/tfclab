# Test-completeness correction

## Implemented
The shared Dashboard scientific section and Lab incorrectly required a successful Nolio bike fit before rendering metabolic curves, even when a dated bilan already supplied every model input. `labCurveSource` now retains the athlete's own dated, sport-specific bilan inputs when an optional Nolio fit is unavailable. Bike Nolio fits remain available; no running value is borrowed from them. No missing numerical inputs are fabricated and no stored values are rewritten.

## Evidence
16 Lab tests pass, including four new source-policy tests: complete bike inputs without a Nolio fit, running independence, missing weight and a bilan outside the period. Authenticated Emanuela Lab rendered the six-month bike curves from her 12 November bilan despite only one eligible Nolio record. Running and 430×706 layout were checked with no overflow or page errors. Latest harness build OK. Both AI generators successfully redeployed for metadata synchronisation and their live release declarations match the preview; no generation or publication performed.

## Not a global completeness guarantee
The screenshot still shows absent CP/W′ and prolonged durability in the reference inventory. These are separate critical-metric and longitudinal observations, not outputs proven by completing the ordinary test battery. No raw protocols or physiological measurements were fabricated to populate them. The app-wide graph audit, missing raw test-series recovery and cardiac session analyses are still incomplete. Source selection in Compass, diagnostic engines, imports, test sheets and plan prescriptions was not changed by this correction.