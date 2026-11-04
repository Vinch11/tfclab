-- Candidate only. Not executed against QA or production.
-- Human content review, separate from athlete checks and sporting/release authority.
CREATE TABLE public.det_library_source_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id),
  family text NOT NULL CHECK (family IN ('marathon', 'semi_marathon')),
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  manifest jsonb NOT NULL CHECK (coalesce((
    manifest->>'schema' = 'tfcl.det.library-review.v1'
    AND manifest->>'family' = family
    AND manifest->'scientificAttestation' = 'false'::jsonb
    AND manifest->'prescriptionAllowed' = 'false'::jsonb
    AND jsonb_typeof(manifest->'sources') = 'array'
  ), false)),
  decision text NOT NULL CHECK (decision IN ('reviewed', 'withdrawn')),
  reviewer_notes text NOT NULL CHECK (length(trim(reviewer_notes)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(manifest::text) < 2000000)
);
CREATE INDEX det_lsr_lookup ON public.det_library_source_reviews
  (coach_id, family, manifest_hash, created_at DESC);
ALTER TABLE public.det_library_source_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.det_library_source_reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON public.det_library_source_reviews TO authenticated;
CREATE POLICY det_lsr_read ON public.det_library_source_reviews FOR SELECT TO authenticated
  USING (coach_id = auth.uid());
CREATE POLICY det_lsr_insert ON public.det_library_source_reviews FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()));
-- No UPDATE/DELETE: withdrawal is another row. The newest exact-bound row wins.
