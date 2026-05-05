
ALTER TABLE public.calibration_evidence
  DROP CONSTRAINT calibration_evidence_evidence_type_check;

ALTER TABLE public.calibration_evidence
  ADD CONSTRAINT calibration_evidence_evidence_type_check
  CHECK (evidence_type = ANY (ARRAY[
    'SPRINT_15S', 'P30', 'P60', 'MAP', 'TTE_OBS',
    'PACED_RACE', 'DRIFT', 'ECONOMY',
    'RUN_MLSS_MODEL_C_TRACE', 'RUN_MLSS_EXTERNAL_COHORT',
    'VLAMAX_CAP_ANCHOR', 'VLAMAX_MODEL_TRACE'
  ]));
