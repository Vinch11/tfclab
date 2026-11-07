-- Run AFTER migration 0024. Exercise the ACTUAL PostgreSQL table checks on
-- a temporary clone, never on live receipt rows. No positive dry-run evidence
-- is fabricated. Everything created here is discarded by ROLLBACK.
BEGIN;
CREATE TEMP TABLE receipt_key_regression
  (LIKE public.qa_nolio_v2_plan_dry_run_receipts INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
  ON COMMIT DROP;
DO $$
DECLARE k text;
BEGIN
  IF NOT has_column_privilege('authenticated','public.qa_nolio_v2_plan_verify_receipts','provider_resource','SELECT') THEN RAISE EXCEPTION 'verification resource column not readable'; END IF;
  FOREACH k IN ARRAY ARRAY['S1-J1-0','S1-J5-7~bike','S1-J5-7~run','S40-J6-128~run'] LOOP
    INSERT INTO receipt_key_regression (job_id,coach_id,op_index,session_key,session_date,body_sha256,outcome,code,http_status)
      VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',0,k,'2026-11-07',repeat('a',64),'REFUSED','fixture_constraint_test',NULL);
  END LOOP;
  FOREACH k IN ARRAY ARRAY['S1-J5-7~swim','S1-J5-7~bike~run','S1-J7-7~bike','prefixS1-J1-0','S1-J5-7~','S1-J5-7 extra'] LOOP
    BEGIN
      INSERT INTO receipt_key_regression (job_id,coach_id,op_index,session_key,session_date,body_sha256,outcome,code,http_status)
        VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',0,k,'2026-11-07',repeat('a',64),'REFUSED','fixture_constraint_test',NULL);
      RAISE EXCEPTION 'invalid key unexpectedly accepted: %',k;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;
  IF (SELECT count(*) FROM receipt_key_regression)<>4 THEN RAISE EXCEPTION 'expected four valid key shapes'; END IF;
END $$;
SELECT 4 AS accepted_valid_keys,6 AS rejected_invalid_keys,'temporary_clone_rolled_back' AS test_scope;
ROLLBACK;
