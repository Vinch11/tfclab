-- TFCLab P0: METADATA ONLY. Read-only inspection in verified QA backend.
-- Does not assert that the currently selected DB is safely isolated.
-- No SELECT of athlete / user rows. Do NOT run migrations from this file.
-- 1. Tables, actual row-level-security activation.
WITH required(name) AS (
  VALUES ('athletes'), ('tests'), ('snapshots'), ('plan_versions'), ('plans')
)
SELECT required.name AS table_name,
       CASE WHEN c.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS table_status,
       COALESCE(c.relrowsecurity, false) AS rls_enabled,
       COALESCE(c.relforcerowsecurity, false) AS rls_forced
FROM required
LEFT JOIN pg_catalog.pg_class c
  ON c.relname = required.name
 AND c.relnamespace = 'public'::pg_catalog.regnamespace
 AND c.relkind IN ('r', 'p')
ORDER BY required.name;

-- 2. Policy definitions (schema metadata; not evidence of runtime Auth behavior).
SELECT tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('athletes', 'tests', 'snapshots', 'plan_versions', 'plans')
ORDER BY tablename, policyname;

-- 3. All declared PK/FK/UNIQUE constraints for the five tables.
SELECT c.relname AS table_name,
       co.conname AS constraint_name,
       CASE co.contype WHEN 'p' THEN 'PK'
         WHEN 'f' THEN 'FK'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'c' THEN 'CHECK'
         ELSE co.contype::text END AS constraint_kind,
       pg_catalog.pg_get_constraintdef(co.oid) AS definition
FROM pg_catalog.pg_constraint co
JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
WHERE c.relnamespace = 'public'::pg_catalog.regnamespace
  AND c.relname IN ('athletes','tests','snapshots','plan_versions','plans')
ORDER BY c.relname, co.conname;
