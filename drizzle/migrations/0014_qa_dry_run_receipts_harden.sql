ALTER TABLE public.qa_nolio_v2_dry_run_receipts
  ADD CONSTRAINT qa_dry_run_receipts_valid_requires_http CHECK (outcome <> 'DRY_RUN_VALID' OR http_status IS NOT NULL);
REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_dry_run_receipts FROM service_role;
GRANT SELECT, INSERT ON TABLE public.qa_nolio_v2_dry_run_receipts TO service_role;