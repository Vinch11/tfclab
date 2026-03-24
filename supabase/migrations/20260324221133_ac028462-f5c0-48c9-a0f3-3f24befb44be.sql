CREATE TABLE public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective text,
  weeks_count integer,
  sessions_count integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_versions_select_own" ON public.plan_versions FOR SELECT USING (coach_id = auth.uid());
CREATE POLICY "plan_versions_insert_own" ON public.plan_versions FOR INSERT WITH CHECK (coach_id = auth.uid());
CREATE POLICY "plan_versions_delete_own" ON public.plan_versions FOR DELETE USING (coach_id = auth.uid());