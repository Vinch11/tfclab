CREATE TABLE public.qa_coach_recipe_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL DEFAULT auth.uid(),
  athlete_id uuid NOT NULL,
  recipe_code text NOT NULL,
  run_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reference','final','partial','recovery')),
  verified_user_id uuid NOT NULL,
  reference_version_id uuid,
  reference_current_sha256 text,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.qa_coach_recipe_reports TO authenticated;
GRANT ALL ON public.qa_coach_recipe_reports TO service_role;
ALTER TABLE public.qa_coach_recipe_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa recipe reports: owner insert" ON public.qa_coach_recipe_reports
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND verified_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.coach_id = auth.uid()));
CREATE POLICY "qa recipe reports: owner select" ON public.qa_coach_recipe_reports
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
COMMENT ON TABLE public.qa_coach_recipe_reports IS 'QA only: append-only recipe reports (no UPDATE/DELETE grants or policies).';