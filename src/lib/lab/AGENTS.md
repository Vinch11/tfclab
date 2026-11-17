# Lab presentation

- Build lab data only from the athlete's reference snapshot and canonical sport-specific estimators; never persist outputs or feed plan rankings. Why: exploratory curves must not become measurements or prescriptions.
- Show running substrate models on relative oxygen intensity, not cycling watts or an inferred threshold pace; lactate kinetics remain cycling-only. Why: sport-specific validation is incomplete.
- Dashboard and Lab use the shared read-only `AthleteEvidenceCharts` projection and `nolioCalibration`, never Compass or plan inputs. Why: the same dated evidence must produce the same curves without rewriting athlete data.
- Preserve observed record values and require dates within both period bounds; never manufacture a shorter record by enforcing monotonicity. Why: provenance must describe an actual observed effort.
- Use `labCurveSource` to retain dated sport-specific bilan curves when an optional Nolio fit is unavailable. Why: imported test results remain evidence even without a separate test sheet or recent records.
- Retrieve period maxima through Nolio v2 with explicit dates and athlete selection, querying every active sport variant; suspend incomplete reads and never substitute filtered lifetime maxima. Why: a lifetime maximum outside the period hides the period's actual best effort.
