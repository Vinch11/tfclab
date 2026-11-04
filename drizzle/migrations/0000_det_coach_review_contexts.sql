-- QA: revues coach DET (append-only). Additive uniquement : aucune table existante modifiée.
CREATE TABLE public.det_coach_review_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  inputs_snapshot jsonb NOT NULL,
  inputs_hash text NOT NULL,
  sources_version text NOT NULL,
  source_qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_clock jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT det_crc_inputs_hash_hex CHECK (inputs_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT det_crc_sources_version_hex CHECK (sources_version ~ '^[a-f0-9]{64}$'),
  CONSTRAINT det_crc_snapshot_object CHECK (jsonb_typeof(inputs_snapshot) = 'object'),
  CONSTRAINT det_crc_quals_array CHECK (jsonb_typeof(source_qualifications) = 'array'),
  CONSTRAINT det_crc_clock_object CHECK (session_clock IS NULL OR jsonb_typeof(session_clock) = 'object'),
  CONSTRAINT det_crc_size CHECK (octet_length(inputs_snapshot::text) + octet_length(source_qualifications::text) + octet_length(coalesce(session_clock::text, '')) < 2000000)
);
CREATE INDEX det_crc_coach_athlete_created_idx ON public.det_coach_review_contexts (coach_id, athlete_id, created_at DESC);

GRANT SELECT, INSERT ON public.det_coach_review_contexts TO authenticated;
GRANT ALL ON public.det_coach_review_contexts TO service_role;

ALTER TABLE public.det_coach_review_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "det_crc_select_own" ON public.det_coach_review_contexts
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "det_crc_insert_own_athlete" ON public.det_coach_review_contexts
  FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND public.is_staff_coach(auth.uid())
    AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.coach_id = auth.uid())
  );

COMMENT ON TABLE public.det_coach_review_contexts IS 'QA DET: append-only coach review contexts (inputs snapshot + per-athlete V3 source qualifications + confirmed clock). No UPDATE/DELETE: a change requires a new row. A source qualification is never a plan approval.';