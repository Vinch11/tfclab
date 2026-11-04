CREATE TABLE IF NOT EXISTS public.qa_nolio_v2_dry_run_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  fixture_code text NOT NULL CHECK (fixture_code = 'QA_TECH_RUN_10MIN_NO_TARGET'),
  payload_sha256 text CHECK (payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$'),
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  outcome text NOT NULL CHECK (outcome IN ('DRY_RUN_VALID','REFUSED','UNKNOWN')),
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]{1,64}$'),
  real_send text NOT NULL DEFAULT 'ABSENT' CHECK (real_send = 'ABSENT'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (outcome <> 'DRY_RUN_VALID' OR (code = 'dry_run_valid' AND http_status BETWEEN 200 AND 299 AND payload_sha256 IS NOT NULL))
);
REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_dry_run_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.qa_nolio_v2_dry_run_receipts TO authenticated;
GRANT ALL ON TABLE public.qa_nolio_v2_dry_run_receipts TO service_role;
ALTER TABLE public.qa_nolio_v2_dry_run_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qa_dry_run_receipts_select_own ON public.qa_nolio_v2_dry_run_receipts;
CREATE POLICY qa_dry_run_receipts_select_own ON public.qa_nolio_v2_dry_run_receipts
  FOR SELECT TO authenticated USING (coach_id = auth.uid());