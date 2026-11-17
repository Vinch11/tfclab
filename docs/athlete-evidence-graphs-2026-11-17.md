# Athlete-evidence graph rollout

## Rule
Graphs must be personalised from athlete tests, dated Nolio records and session analysis over a specified period; no generic fallback is allowed. Personalised TFCL calculations are allowed, with actual observed points distinguished from calculated values. Compass remains unchanged.

## Implemented and checked
- Dashboard Staff/Profile scientific section and all Lab graph sections now use `AthleteEvidenceCharts`. Both read athlete-scoped Nolio records with pagination, show the period before the reference snapshot, plot actual duration/value/date records, and reuse the bike fit or running critical-speed fit. Snapshot histories and raw tests are filtered to that period.
- Missing or failed Nolio reads do not trigger a generic metabolic fallback. The previous Lab bottom Mader/CP chart and exploratory oxygen/zones charts are no longer rendered in this shared view. Records remain untouched, including nonmonotonic values; undated and future records are excluded.
- The six metabolic charts appear only with a bike record fit. Invented oxygen/lactate dots projected from power records were removed: watts do not constitute oxygen or lactate observations. The real record table and power-duration dots remain visible.
- Emanuela authenticated Lab: 24-month bike records and fit, 6-month insufficient-data state, running selection and 430×706 layout checked. Authenticated Dashboard Staff/Profile: the same personal record chart rendered and visibly checked. No runtime errors in these checks. Vince not checked.
- 34 targeted tests passed. Latest harness build OK. Both AI generators successfully redeployed solely to synchronise release metadata; live GET metadata and preview version match the fresh declaration. No plans, snapshots, records or permissions changed; no publication.

## Other locations read, not yet migrated
- `Index.tsx` still renders an independent `FatCarbOxidationChart` outside the scientific section. It uses snapshot values without a dated record fit.
- `NolioAnalysisCard.tsx` still builds a snapshot-only bike overlay with no per-point observed series or record dates.
- `NolioImporter.tsx` uses uploaded CSV record points, but its overlays still use default weight when missing and its running overlay uses a cycling Mader model; period provenance is not enforced by the shared view.
- `PowerDurationUnifiedChart.tsx` remains in source but no longer has a direct application caller found after migration. Its old scatter does not store an observed power field, and its ±5% band is not empirical uncertainty.
- `LactatePredictionCurve.tsx` and `WhatIfSimulator.tsx` were partly read; no active JSX caller found. They are not evidence of completed app-wide compliance.
- Reports, Evolution/TrackDay/RaceSimulation, other metabolic charts, jobs and installed database functions were not exhaustively audited for this new requirement. No global-compliance claim.

## Session-analysis boundary
The existing `nolio-v2-oauth` protocol-session read was inspected: it allows only time, watts/power and speed/velocity streams, not heart-rate streams. No real sessions were fetched or analysed in this rollout. Per-session cardiac response, drift and protocol analysis remain to implement and validate; record fits must not be described as session analysis or laboratory validation.

## Scientific boundaries
The fit remains a descriptive model, not identification of unique physiological VO₂max/VLamax values from records. Old records do not establish current fitness. Lactate elimination remains a modelling assumption anchored at model MLSS, not a measured elimination curve. Separate sport models and data provenance must remain explicit.