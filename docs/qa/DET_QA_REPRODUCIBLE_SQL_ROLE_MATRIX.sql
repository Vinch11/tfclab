-- TFCLab DET QA P0: reproducible PostgreSQL RLS / FK test matrix.
-- EXACT TARGET: isolated Lovable QA project, NEVER TFCLab Live.
-- All test writes occur inside BEGIN ... ROLLBACK; nothing is committed.
-- Uses SET LOCAL ROLE authenticated + request.jwt.claim.sub (synthetic SQL
-- identity), NOT real Auth HTTP/JWT/PostgREST. Does NOT certify the UI.
-- Requires the QA-only four restrictive RLS guards and three integrity FKs.
BEGIN;

DO $qa_matrix$
DECLARE
  a_id uuid;
  a_owner uuid;
  b_id uuid;
  b_owner uuid;
  accepted boolean;
  n integer;
BEGIN
  IF (SELECT count(*) FROM public.athletes) <> 2
    OR (SELECT count(*) FROM auth.users) <> 2
    OR (SELECT count(*) FROM public.profiles
      WHERE role='STAFF_COACH' AND onboarding_completed) <> 2
    OR (SELECT count(*) FROM public.plan_versions) <> 4
    OR (SELECT count(*) FROM public.plans) <> 1
    OR (SELECT count(*) FROM public.tests) <> 0
    OR (SELECT count(*) FROM public.snapshots) <> 0
    OR (SELECT count(*) FROM public.nolio_records) <> 0
    OR (SELECT count(*) FROM cron.job) <> 0
  THEN RAISE EXCEPTION 'QA_P0_PRECHECK_COUNTS_MISMATCH'; END IF;

  SELECT id,coach_id INTO STRICT a_id,a_owner
    FROM public.athletes
    WHERE name='QA_DET_A' AND refs->>'qa_fixture'='true';
  SELECT id,coach_id INTO STRICT b_id,b_owner
    FROM public.athletes
    WHERE name='QA_DET_B' AND refs->>'qa_fixture'='true';
  IF a_id=b_id OR a_owner=b_owner THEN
    RAISE EXCEPTION 'QA_P0_OWNER_IDS_NOT_DISTINCT';
  END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname='public'
        AND policyname IN (
          'tfcl_p0_plan_versions_athlete_owner_guard',
          'tfcl_p0_plans_athlete_owner_guard',
          'tfcl_p0_tests_athlete_owner_guard',
          'tfcl_p0_snapshots_athlete_owner_guard')) <> 4
     OR (SELECT count(*) FROM pg_catalog.pg_constraint
         WHERE conname IN ('plan_versions_athlete_id_fkey',
          'tfcl_p0_snapshot_owner_unique',
          'tfcl_p0_active_snapshot_owned')) <> 3
  THEN RAISE EXCEPTION 'QA_P0_SCHEMA_GUARDS_NOT_INSTALLED'; END IF;

  -- Lower privileges: do not use the admin role for RLS proofs.
  PERFORM set_config('request.jwt.claim.sub', b_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF auth.uid() IS DISTINCT FROM b_owner
    OR (SELECT count(*) FROM public.athletes) <> 1
    OR (SELECT count(*) FROM public.athletes WHERE id=a_id) <> 0
    OR (SELECT count(*) FROM public.athletes WHERE id=b_id) <> 1
    OR (SELECT count(*) FROM public.plan_versions) <> 0
    OR (SELECT count(*) FROM public.plans) <> 0
  THEN RAISE EXCEPTION 'QA_P0_FOREIGN_READ_LEAK'; END IF;

  -- Coach B must not be able to write a version for coach A's athlete.
  accepted := false;
  BEGIN
    INSERT INTO public.plan_versions
      (athlete_id,coach_id,plan_json,objective)
    VALUES (a_id,b_owner,'{"qa":"rollback_foreign_version"}'::jsonb,
      'QA_ROLLBACK_FOREIGN');
    accepted := true;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN
      RAISE EXCEPTION 'QA_P0_UNEXPECTED_FOREIGN_VERSION_SQLSTATE:%',SQLSTATE;
    END IF;
  END;
  IF accepted THEN RAISE EXCEPTION 'QA_P0_FOREIGN_VERSION_ACCEPTED'; END IF;

  accepted := false;
  BEGIN
    INSERT INTO public.plans (athlete_id,coach_id,plan_json)
    VALUES (a_id,b_owner,'{"qa":"rollback_foreign_plan"}'::jsonb);
    accepted := true;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN
      RAISE EXCEPTION 'QA_P0_UNEXPECTED_FOREIGN_PLAN_SQLSTATE:%',SQLSTATE;
    END IF;
  END;
  IF accepted THEN RAISE EXCEPTION 'QA_P0_FOREIGN_PLAN_ACCEPTED'; END IF;

  accepted := false;
  BEGIN
    INSERT INTO public.tests (athlete_id,coach_id,name,type,raw)
    VALUES (a_id,b_owner,'QA_ROLLBACK_FOREIGN','field','{}'::jsonb);
    accepted := true;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN
      RAISE EXCEPTION 'QA_P0_UNEXPECTED_FOREIGN_TEST_SQLSTATE:%',SQLSTATE;
    END IF;
  END;
  IF accepted THEN RAISE EXCEPTION 'QA_P0_FOREIGN_TEST_ACCEPTED'; END IF;

  accepted := false;
  BEGIN
    INSERT INTO public.snapshots (athlete_id,coach_id,source,field_sources)
    VALUES (a_id,b_owner,'QA_ROLLBACK_FOREIGN','{}'::jsonb);
    accepted := true;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' THEN
      RAISE EXCEPTION 'QA_P0_UNEXPECTED_FOREIGN_SNAPSHOT_SQLSTATE:%',SQLSTATE;
    END IF;
  END;
  IF accepted THEN RAISE EXCEPTION 'QA_P0_FOREIGN_SNAPSHOT_ACCEPTED'; END IF;

  -- Positive controls: the own athlete is writable. The outer transaction
  -- always rolls these inserts back.
  INSERT INTO public.plan_versions
    (athlete_id,coach_id,plan_json,objective)
  VALUES (b_id,b_owner,'{"qa":"rollback_own_version"}'::jsonb,
    'QA_ROLLBACK_OWN');
  INSERT INTO public.plans (athlete_id,coach_id,plan_json)
  VALUES (b_id,b_owner,'{"qa":"rollback_own_plan"}'::jsonb);
  INSERT INTO public.tests (athlete_id,coach_id,name,type,raw)
  VALUES (b_id,b_owner,'QA_ROLLBACK_OWN','field','{}'::jsonb);
  INSERT INTO public.snapshots
    (athlete_id,coach_id,source,field_sources)
  VALUES (b_id,b_owner,'QA_ROLLBACK_OWN','{}'::jsonb);
  IF (SELECT count(*) FROM public.plan_versions) <> 1
    OR (SELECT count(*) FROM public.plans) <> 1
    OR (SELECT count(*) FROM public.tests) <> 1
    OR (SELECT count(*) FROM public.snapshots) <> 1
  THEN RAISE EXCEPTION 'QA_P0_OWN_WRITE_NOT_VISIBLE'; END IF;

  PERFORM set_config('tfcl.qa_p0_matrix','PASS:4_FOREIGN_DENIED_4_OWN_ACCEPTED',true);
END;
$qa_matrix$;

SELECT current_setting('tfcl.qa_p0_matrix',true) AS result;
ROLLBACK;

-- After execution verify counts separately in read-only administrative SQL:
-- 2 athletes, 4 plan_versions, 1 current plan, 0 tests, 0 snapshots.
