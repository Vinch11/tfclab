-- QA : journal durable des opérations Nolio V2 (aucune déduplication côté Nolio). Additif.
CREATE TABLE public.nolio_v2_operations (
  op_key text PRIMARY KEY,
  coach_id uuid NOT NULL,
  plan_version_id uuid NOT NULL,
  session_key text NOT NULL,
  path text NOT NULL,
  athlete_ref text NOT NULL,
  payload_sha256 text NOT NULL,
  api_version text NOT NULL DEFAULT 'v2',
  state text NOT NULL,
  remote_id text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nv2_op_key_hex CHECK (op_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT nv2_payload_hex CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT nv2_api CHECK (api_version = 'v2'),
  CONSTRAINT nv2_path CHECK (path IN ('/api/v2/planned/trainings/', '/api/v2/planned/competitions/')),
  CONSTRAINT nv2_state CHECK (state IN ('prepared', 'sent_unconfirmed', 'confirmed', 'ambiguous', 'rejected')),
  CONSTRAINT nv2_athlete_opaque CHECK (athlete_ref ~ '^usr_[A-Za-z0-9]+$'),
  CONSTRAINT nv2_confirmed_has_remote CHECK (state <> 'confirmed' OR remote_id IS NOT NULL)
);
CREATE INDEX nv2_ops_plan_idx ON public.nolio_v2_operations (coach_id, plan_version_id);

GRANT SELECT ON public.nolio_v2_operations TO authenticated;
GRANT ALL ON public.nolio_v2_operations TO service_role;
REVOKE ALL ON public.nolio_v2_operations FROM anon;

ALTER TABLE public.nolio_v2_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nv2_ops_select_own" ON public.nolio_v2_operations
  FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE TRIGGER update_nolio_v2_operations_updated_at
  BEFORE UPDATE ON public.nolio_v2_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.nolio_v2_operations IS 'QA: durable Nolio V2 operation ledger. Written only by the V2 sender (service role) after caller verification. sent_unconfirmed must be reconciled before any resend; ambiguous blocks.';