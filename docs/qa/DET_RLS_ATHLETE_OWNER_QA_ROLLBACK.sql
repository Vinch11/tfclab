-- TFCLab QA only: restore original schema after candidate P0 RLS / FK tests.
-- DO NOT RUN in production. Apply only to independent Lovable QA project.
-- Do not use this as an automatic cleanup of synthetic fixture rows.
BEGIN;
DROP POLICY IF EXISTS tfcl_p0_plan_versions_athlete_owner_guard ON public.plan_versions;
DROP POLICY IF EXISTS tfcl_p0_plans_athlete_owner_guard ON public.plans;
DROP POLICY IF EXISTS tfcl_p0_tests_athlete_owner_guard ON public.tests;
DROP POLICY IF EXISTS tfcl_p0_snapshots_athlete_owner_guard ON public.snapshots;
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS tfcl_p0_active_snapshot_owned;
ALTER TABLE public.snapshots DROP CONSTRAINT IF EXISTS tfcl_p0_snapshot_owner_unique;
ALTER TABLE public.plan_versions DROP CONSTRAINT IF EXISTS plan_versions_athlete_id_fkey;
COMMIT;
-- Re-run the QA-only schema/RLS metadata audit to confirm the rollback.
