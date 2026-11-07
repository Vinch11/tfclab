CREATE TABLE public.qa_pilot_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL DEFAULT auth.uid(),
  athlete_id uuid NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('scenario','owned_version')),
  scenario_id text,
  plan_version_id uuid,
  plan_sha256 text NOT NULL CHECK (plan_sha256 ~ '^[a-f0-9]{64}$'),
  engine_component_hash text NOT NULL CHECK (engine_component_hash ~ '^[a-f0-9]{64}$'),
  release_id text,
  decisions jsonb NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qa_pilot_review_source CHECK (
    (source_kind = 'scenario' AND scenario_id IS NOT NULL AND plan_version_id IS NULL)
    OR (source_kind = 'owned_version' AND plan_version_id IS NOT NULL)),
  CONSTRAINT qa_pilot_review_never_grants CHECK (
    coalesce(report->>'sportingAttestation','false') = 'false'
    AND coalesce(report->>'prescriptionAllowed','false') = 'false'
    AND coalesce(report->>'sourceQualification','false') = 'false'
    AND coalesce(report->>'release','false') = 'false'
    AND coalesce(report->>'nolioSend','false') = 'false')
);
GRANT SELECT, INSERT ON public.qa_pilot_review_reports TO authenticated;
GRANT ALL ON public.qa_pilot_review_reports TO service_role;
ALTER TABLE public.qa_pilot_review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa pilot review: owner insert" ON public.qa_pilot_review_reports
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.coach_id = auth.uid())
    AND (plan_version_id IS NULL OR EXISTS (SELECT 1 FROM public.plan_versions v WHERE v.id = plan_version_id AND v.coach_id = auth.uid() AND v.athlete_id = athlete_id)));
CREATE POLICY "qa pilot review: owner select" ON public.qa_pilot_review_reports
  FOR SELECT TO authenticated USING (coach_id = auth.uid());
COMMENT ON TABLE public.qa_pilot_review_reports IS 'QA only: append-only synthetic plan QA opinions (no UPDATE/DELETE). Never a sporting attestation, prescription permission, source qualification, release or Nolio send.';