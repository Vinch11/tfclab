-- TFCLab / DET P0 : READ-ONLY independent residue / ownership audit.
-- Execute ONLY in the separately approved isolated Supabase SQL editor,
-- AFTER scripts/qa/isolated-supabase-recette.mjs has finished.
-- Do not run on production, and do not share secrets or personal data.
--
-- All returned counts MUST equal 0. Read-only access to all rows is needed:
-- a coach-scoped API query is NOT sufficient to certify absence of hidden rows.
-- For each failed attempt, also consult syntheticIds + marker in the script's
-- output to investigate exact UUIDs. An unverified audit is NO-GO.

-- 1. Residual synthetic records from this QA harness.
SELECT 'athletes' AS source, COUNT(*) AS remaining
FROM public.athletes
WHERE name LIKE 'TFCL_RECETTE_%'
   OR refs->>'recipe' LIKE 'TFCL_RECETTE_%'
UNION ALL
SELECT 'tests', COUNT(*) FROM public.tests
WHERE name LIKE 'TFCL_RECETTE_%' OR raw->>'recipe' LIKE 'TFCL_RECETTE_%'
UNION ALL
SELECT 'snapshots', COUNT(*) FROM public.snapshots
WHERE field_sources->>'recipe' LIKE 'TFCL_RECETTE_%'
UNION ALL
SELECT 'plan_versions', COUNT(*) FROM public.plan_versions
WHERE plan_json->>'_recipeId' LIKE 'TFCL_RECETTE_%'
UNION ALL
SELECT 'plans', COUNT(*) FROM public.plans
WHERE plan_json->>'_recipeId' LIKE 'TFCL_RECETTE_%'
   OR plan_json->>'intruder' LIKE 'TFCL_RECETTE_%';

-- 2. Confirm RLS is actually enabled on all five relevant tables.
-- A CREATE POLICY is insufficient when relrowsecurity=false.
SELECT COUNT(*) AS rls_disabled_or_missing
FROM (VALUES ('athletes'), ('plan_versions'), ('plans'), ('tests'), ('snapshots')) AS required(table_name)
LEFT JOIN pg_class c
  ON c.relname = required.table_name
 AND c.relnamespace = 'public'::regnamespace
WHERE c.oid IS NULL OR NOT c.relrowsecurity;

-- 3. Global owner/foreign-key consistency in the isolated QA project.
-- Includes synthetic rows invisible to either coach under RLS.
SELECT 'plan_versions' AS source, COUNT(*) AS ownership_mismatches
FROM public.plan_versions p LEFT JOIN public.athletes a ON a.id = p.athlete_id
WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM p.coach_id
UNION ALL
SELECT 'plans', COUNT(*) FROM public.plans p
LEFT JOIN public.athletes a ON a.id = p.athlete_id
WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM p.coach_id
UNION ALL
SELECT 'tests', COUNT(*) FROM public.tests t
LEFT JOIN public.athletes a ON a.id = t.athlete_id
WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM t.coach_id
UNION ALL
SELECT 'snapshots', COUNT(*) FROM public.snapshots s
LEFT JOIN public.athletes a ON a.id = s.athlete_id
WHERE a.id IS NULL OR a.coach_id IS DISTINCT FROM s.coach_id;
