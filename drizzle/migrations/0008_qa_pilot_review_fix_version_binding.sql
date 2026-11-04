DROP POLICY "qa pilot review: owner insert" ON public.qa_pilot_review_reports;
CREATE POLICY "qa pilot review: owner insert" ON public.qa_pilot_review_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    qa_pilot_review_reports.coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.athletes a
                WHERE a.id = qa_pilot_review_reports.athlete_id AND a.coach_id = auth.uid())
    AND (qa_pilot_review_reports.plan_version_id IS NULL OR EXISTS (
          SELECT 1 FROM public.plan_versions v
          WHERE v.id = qa_pilot_review_reports.plan_version_id
            AND v.coach_id = qa_pilot_review_reports.coach_id
            AND v.coach_id = auth.uid()
            AND v.athlete_id = qa_pilot_review_reports.athlete_id)));