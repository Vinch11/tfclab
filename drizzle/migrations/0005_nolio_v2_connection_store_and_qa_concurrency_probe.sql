-- Magasin de connexions Nolio V2 (séparé de V1 nolio_tokens). Vide : aucune connexion créée.
CREATE TABLE public.nolio_v2_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  api_version text NOT NULL CHECK (api_version = 'v2'),
  app_type text NOT NULL CHECK (app_type IN ('partner','team')),
  status text NOT NULL CHECK (status IN ('active','revoked')),
  nolio_athlete_ref text NOT NULL CHECK (nolio_athlete_ref ~ '^usr_[A-Za-z0-9]+$'),
  granted_scopes text[] NOT NULL,
  access_token text NOT NULL CHECK (length(access_token) > 0),
  token_expires_at timestamptz NOT NULL,
  refs jsonb NOT NULL,
  consent_confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.nolio_v2_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.nolio_v2_connections TO service_role;
ALTER TABLE public.nolio_v2_connections ENABLE ROW LEVEL SECURITY;
-- Aucune policy : anon/authenticated n'ont ni privilège ni ligne visible ; service_role seulement.
CREATE UNIQUE INDEX nolio_v2_connections_one_active
  ON public.nolio_v2_connections (coach_id, athlete_id) WHERE status = 'active';

-- Enveloppe QA de preuve de concurrence : appelle la VRAIE RPC dans une transaction tenue.
CREATE OR REPLACE FUNCTION public.qa_nolio_v2_concurrent_claim_probe(
  p_op_key text, p_coach_id uuid, p_plan_version_id uuid, p_session_key text,
  p_path text, p_athlete_ref text, p_payload_sha256 text, p_hold_ms integer)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pid int := pg_backend_pid();
  v_t0 timestamptz := clock_timestamp();
  v_before int; v_t_claim0 timestamptz; v_t_claim1 timestamptz; v_res jsonb;
BEGIN
  IF p_session_key NOT LIKE '\_\_qa\_concurrency\_probe\_%' THEN RAISE EXCEPTION 'qa_probe_session_key_required'; END IF;
  IF p_hold_ms < 100 OR p_hold_ms > 5000 THEN RAISE EXCEPTION 'qa_probe_hold_out_of_range'; END IF;
  SELECT count(*) INTO v_before FROM public.nolio_v2_operations
   WHERE op_key = p_op_key OR (plan_version_id = p_plan_version_id AND session_key = p_session_key AND path = p_path);
  PERFORM pg_sleep(p_hold_ms / 1000.0);
  v_t_claim0 := clock_timestamp();
  v_res := public.nolio_v2_claim_operation(p_op_key, p_coach_id, p_plan_version_id, p_session_key, p_path, p_athlete_ref, p_payload_sha256);
  v_t_claim1 := clock_timestamp();
  PERFORM pg_sleep(p_hold_ms / 1000.0);
  RETURN jsonb_build_object('pid', v_pid, 'txid', txid_current(), 't0', v_t0, 'rowsSeenBefore', v_before,
    'claimStart', v_t_claim0, 'claimEnd', v_t_claim1, 'claimed', v_res->'claimed',
    'existingState', v_res->'existing'->>'state', 'tEnd', clock_timestamp());
END $$;
REVOKE ALL ON FUNCTION public.qa_nolio_v2_concurrent_claim_probe(text, uuid, uuid, text, text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_concurrent_claim_probe(text, uuid, uuid, text, text, text, text, integer) TO service_role;