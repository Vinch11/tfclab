CREATE TABLE public.qa_nolio_v2_plan_dry_run_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id),
  plan_sha256 text NOT NULL CHECK (plan_sha256 ~ '^[0-9a-f]{64}$'),
  refs_sha256 text NOT NULL CHECK (refs_sha256 ~ '^[0-9a-f]{64}$'),
  ops_sha256 text NOT NULL CHECK (ops_sha256 ~ '^[0-9a-f]{64}$'),
  total_sessions integer NOT NULL CHECK (total_sessions > 0),
  total_ops integer NOT NULL CHECK (total_ops > 0 AND total_ops <= total_sessions),
  lock_id uuid,
  lock_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, plan_version_id, refs_sha256, ops_sha256)
);
GRANT SELECT (id, coach_id, athlete_id, plan_version_id, plan_sha256, refs_sha256, ops_sha256, total_sessions, total_ops, created_at) ON public.qa_nolio_v2_plan_dry_run_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qa_nolio_v2_plan_dry_run_jobs TO service_role;
ALTER TABLE public.qa_nolio_v2_plan_dry_run_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan dry-run jobs" ON public.qa_nolio_v2_plan_dry_run_jobs FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_plan_jobs_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.coach_id IS DISTINCT FROM OLD.coach_id OR NEW.athlete_id IS DISTINCT FROM OLD.athlete_id
     OR NEW.plan_version_id IS DISTINCT FROM OLD.plan_version_id OR NEW.plan_sha256 IS DISTINCT FROM OLD.plan_sha256
     OR NEW.refs_sha256 IS DISTINCT FROM OLD.refs_sha256 OR NEW.ops_sha256 IS DISTINCT FROM OLD.ops_sha256
     OR NEW.total_sessions IS DISTINCT FROM OLD.total_sessions OR NEW.total_ops IS DISTINCT FROM OLD.total_ops
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'plan dry-run job is frozen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_nolio_v2_plan_jobs_guard BEFORE UPDATE ON public.qa_nolio_v2_plan_dry_run_jobs FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_plan_jobs_guard();

CREATE TABLE public.qa_nolio_v2_plan_dry_run_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.qa_nolio_v2_plan_dry_run_jobs(id),
  coach_id uuid NOT NULL,
  op_index integer NOT NULL CHECK (op_index >= 0),
  session_key text NOT NULL CHECK (session_key ~ '^S[0-9]+-J[0-6]-[0-9]+$'),
  session_date date NOT NULL,
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('DRY_RUN_VALID','REFUSED','UNKNOWN')),
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]{1,64}$'),
  http_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qa_plan_dry_valid_requires_http CHECK (outcome <> 'DRY_RUN_VALID' OR (http_status IS NOT NULL AND http_status BETWEEN 200 AND 299 AND code = 'dry_run_valid'))
);
CREATE UNIQUE INDEX qa_plan_dry_one_valid_per_op ON public.qa_nolio_v2_plan_dry_run_receipts (job_id, op_index) WHERE outcome = 'DRY_RUN_VALID';
GRANT SELECT ON public.qa_nolio_v2_plan_dry_run_receipts TO authenticated;
GRANT SELECT, INSERT ON public.qa_nolio_v2_plan_dry_run_receipts TO service_role;
ALTER TABLE public.qa_nolio_v2_plan_dry_run_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan dry-run receipts" ON public.qa_nolio_v2_plan_dry_run_receipts FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_plan_job_lease(p_job_id uuid, p_coach_id uuid, p_lock_id uuid, p_seconds integer) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    UPDATE public.qa_nolio_v2_plan_dry_run_jobs SET lock_id = p_lock_id, lock_until = now() + make_interval(secs => LEAST(GREATEST(p_seconds, 1), 120))
    WHERE id = p_job_id AND coach_id = p_coach_id AND (lock_until IS NULL OR lock_until < now())
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
CREATE OR REPLACE FUNCTION public.qa_nolio_v2_plan_job_release(p_job_id uuid, p_coach_id uuid, p_lock_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (UPDATE public.qa_nolio_v2_plan_dry_run_jobs SET lock_id = NULL, lock_until = NULL
    WHERE id = p_job_id AND coach_id = p_coach_id AND lock_id = p_lock_id RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.qa_nolio_v2_plan_job_lease(uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.qa_nolio_v2_plan_job_release(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_plan_job_lease(uuid, uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_plan_job_release(uuid, uuid, uuid) TO service_role;