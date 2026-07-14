CREATE TABLE IF NOT EXISTS public.plan_generation_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  format text NOT NULL,
  ok boolean NOT NULL,
  objective text,
  total_weeks int,
  total_chunks int,
  duration_ms int,
  error_code text,
  custom_ratio numeric,
  substituted_offsport_count int NOT NULL DEFAULT 0,
  offsport_unresolved_count int NOT NULL DEFAULT 0,
  retry_count int NOT NULL DEFAULT 0,
  semantic_repairs jsonb
);

GRANT SELECT, INSERT ON public.plan_generation_stats TO authenticated;
GRANT ALL ON public.plan_generation_stats TO service_role;

ALTER TABLE public.plan_generation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read all plan stats"
  ON public.plan_generation_stats FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth insert own plan stats"
  ON public.plan_generation_stats FOR INSERT
  TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_plan_gen_stats_ts ON public.plan_generation_stats (ts DESC);