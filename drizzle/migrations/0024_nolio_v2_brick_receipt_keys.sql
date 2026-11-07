-- Match the exporter and manifest parser: a source session may expand to
-- exactly two linked bike/run operations. Keep all other receipt checks,
-- ownership policies, append-only guards, keys and existing rows unchanged.
-- The normal client verifies the opaque resource ID already returned by send;
-- permit reading that one field on its own RLS-protected receipt rows only.
BEGIN;
ALTER TABLE public.qa_nolio_v2_plan_dry_run_receipts
  DROP CONSTRAINT qa_nolio_v2_plan_dry_run_receipts_session_key_check,
  ADD CONSTRAINT qa_nolio_v2_plan_dry_run_receipts_session_key_check
  CHECK (session_key ~ '^S[0-9]+-J[0-6]-[0-9]+(~(bike|run))?$');
GRANT SELECT (provider_resource)
  ON public.qa_nolio_v2_plan_verify_receipts TO authenticated;
COMMIT;
