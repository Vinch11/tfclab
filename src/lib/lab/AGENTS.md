# Lab presentation

- Build lab data only from the athlete's reference snapshot and canonical sport-specific estimators; never persist outputs or feed plan rankings. Why: exploratory curves must not become measurements or prescriptions.
- Show running substrate models on relative oxygen intensity, not cycling watts or an inferred threshold pace; lactate kinetics remain cycling-only. Why: sport-specific validation is incomplete.- Nolio recalibration in 100%lab (`nolioCalibration`) reads stored `nolio_records` only, fits bike VO₂max/VLamax on 30 s–20 min records within bounds, and stays page-local. Why: real records should shape the curves without rewriting bilans, Compass or plans.
