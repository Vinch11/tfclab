-- TFCLab / DET P0 : CANDIDATE ONLY, NOT AN APPLIED MIGRATION.
-- Run on an explicitly approved isolated Supabase clone after backup/rollback
-- and a review of actual policies, roles and current row ownership.
-- Never use production to discover whether these predicates work.
--
-- QA clone observed a missing plan_versions FK. The candidate adds one.
-- Include a composite FK candidate for active_snapshot_id ownership.
-- It must be tested on the clone for interactions with the existing FK and
-- its ON DELETE SET NULL action before any production proposal.
-- Observed source policies verify coach_id = auth.uid(), but do not require
-- the athlete_id to reference an athlete owned by the same coach.
-- This restrictive policy is combined (AND) with existing permissive RLS.
-- It cannot establish which policies or triggers are actually deployed.
BEGIN;

DO $ownership_preflight$
BEGIN
  -- A CREATE POLICY can succeed even if RLS is disabled. Fail closed if
  -- any protected table (including the ownership source) lacks active RLS.
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('athletes'), ('plan_versions'), ('plans'), ('tests'), ('snapshots')
    ) AS required(table_name)
    LEFT JOIN pg_class c
      ON c.relname = required.table_name
     AND c.relnamespace = 'public'::regnamespace
    WHERE c.oid IS NULL OR NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_RLS_DISABLED_OR_TABLE_MISSING';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.athletes a
    LEFT JOIN public.snapshots s ON s.id = a.active_snapshot_id
    WHERE a.active_snapshot_id IS NOT NULL
      AND (s.id IS NULL OR s.athlete_id IS DISTINCT FROM a.id
           OR s.coach_id IS DISTINCT FROM a.coach_id)
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_ACTIVE_SNAPSHOT_OWNER_MISMATCH';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.plan_versions p LEFT JOIN public.athletes a ON a.id=p.athlete_id
    WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM p.coach_id
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_PLAN_VERSIONS_OWNER_MISMATCH';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.plans p LEFT JOIN public.athletes a ON a.id=p.athlete_id
    WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM p.coach_id
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_PLANS_OWNER_MISMATCH';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tests t LEFT JOIN public.athletes a ON a.id=t.athlete_id
    WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM t.coach_id
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_TESTS_OWNER_MISMATCH';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.snapshots s LEFT JOIN public.athletes a ON a.id=s.athlete_id
    WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM s.coach_id
  ) THEN
    RAISE EXCEPTION 'TFCL_RLS_PREFLIGHT_SNAPSHOTS_OWNER_MISMATCH';
  END IF;
END;
$ownership_preflight$;

-- Required in the isolated QA clone: `plan_versions` currently has no
-- athlete foreign key. RLS alone is not referential integrity.
-- Historical version deletion follows the already-deployed plans/tests/snapshots
-- ON DELETE CASCADE model; confirm coach product semantics before any production
-- migration. A conflicting same-named FK requires manual review, not overwrite.
DO $plan_version_fk_preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.plan_versions'::regclass
      AND conname = 'plan_versions_athlete_id_fkey'
  ) THEN
    RAISE EXCEPTION 'TFCL_FK_EXISTING_CONSTRAINT_REVIEW_REQUIRED';
  END IF;
END;
$plan_version_fk_preflight$;

ALTER TABLE public.plan_versions
  ADD CONSTRAINT plan_versions_athlete_id_fkey
  FOREIGN KEY (athlete_id) REFERENCES public.athletes(id)
  ON DELETE CASCADE;

-- Prevent a coach from pointing their own athlete to another coach's
-- snapshot through athletes.active_snapshot_id. This is a relational integrity
-- guarantee, not an RLS subquery (which could recurse through snapshots).
-- Both names are new candidate constraints. An existing same-name object
-- requires manual review; never drop/replace a constraint automatically.
DO $active_snapshot_fk_preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE (conrelid='public.snapshots'::regclass
      AND conname='tfcl_p0_snapshot_owner_unique')
       OR (conrelid='public.athletes'::regclass
      AND conname='tfcl_p0_active_snapshot_owned')
  ) THEN
    RAISE EXCEPTION 'TFCL_ACTIVE_SNAPSHOT_EXISTING_CONSTRAINT_REVIEW_REQUIRED';
  END IF;
END;
$active_snapshot_fk_preflight$;

ALTER TABLE public.snapshots
  ADD CONSTRAINT tfcl_p0_snapshot_owner_unique
  UNIQUE (id, athlete_id, coach_id);

-- DEFERRABLE avoids ordering conflicts with the existing single-column FK
-- (ON DELETE SET NULL) when a referenced snapshot is deleted.
-- MUST be exercised for update, deletion, and cleanup in isolated QA.
ALTER TABLE public.athletes
  ADD CONSTRAINT tfcl_p0_active_snapshot_owned
  FOREIGN KEY (active_snapshot_id, id, coach_id)
  REFERENCES public.snapshots (id, athlete_id, coach_id)
  DEFERRABLE INITIALLY DEFERRED;

DROP POLICY IF EXISTS tfcl_p0_plan_versions_athlete_owner_guard ON public.plan_versions;
CREATE POLICY tfcl_p0_plan_versions_athlete_owner_guard
  ON public.plan_versions AS RESTRICTIVE FOR ALL TO authenticated
  USING (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ))
  WITH CHECK (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ));

DROP POLICY IF EXISTS tfcl_p0_plans_athlete_owner_guard ON public.plans;
CREATE POLICY tfcl_p0_plans_athlete_owner_guard
  ON public.plans AS RESTRICTIVE FOR ALL TO authenticated
  USING (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ))
  WITH CHECK (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ));

DROP POLICY IF EXISTS tfcl_p0_tests_athlete_owner_guard ON public.tests;
CREATE POLICY tfcl_p0_tests_athlete_owner_guard
  ON public.tests AS RESTRICTIVE FOR ALL TO authenticated
  USING (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ))
  WITH CHECK (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ));

DROP POLICY IF EXISTS tfcl_p0_snapshots_athlete_owner_guard ON public.snapshots;
CREATE POLICY tfcl_p0_snapshots_athlete_owner_guard
  ON public.snapshots AS RESTRICTIVE FOR ALL TO authenticated
  USING (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ))
  WITH CHECK (coach_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.coach_id = auth.uid()
  ));

COMMIT;

-- AFTER applying to an ISOLATED project only: run the complete
-- scripts/qa/isolated-supabase-recette.mjs two-coach exercise and verify
-- no orphaned or cross-coach rows, including failure/cleanup paths.
-- No publication, no migrations in production, no Nolio or athlete data.
