CREATE TABLE public.plan_adaptations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('patch', 'window_regen', 'full_regen')),
  triggered_by TEXT NOT NULL,
  reason TEXT,
  from_week INTEGER,
  to_week INTEGER,
  diff_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_adaptations_athlete ON public.plan_adaptations(athlete_id, created_at DESC);
CREATE INDEX idx_plan_adaptations_coach ON public.plan_adaptations(coach_id, created_at DESC);

ALTER TABLE public.plan_adaptations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_adaptations_select_own" ON public.plan_adaptations
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "plan_adaptations_insert_own" ON public.plan_adaptations
  FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "plan_adaptations_update_own" ON public.plan_adaptations
  FOR UPDATE USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "plan_adaptations_delete_own" ON public.plan_adaptations
  FOR DELETE USING (coach_id = auth.uid());