-- Nolio V2 : journal durable avec réservation ATOMIQUE avant tout POST (QA).
-- Table vide au moment de la migration ; changement additif des états.
ALTER TABLE public.nolio_v2_operations DROP CONSTRAINT nv2_state;
ALTER TABLE public.nolio_v2_operations ADD CONSTRAINT nv2_state
  CHECK (state = ANY (ARRAY['prepared','sending','sent_unconfirmed','confirmed','ambiguous','rejected','rate_limited']));
COMMENT ON COLUMN public.nolio_v2_operations.state IS 'prepared is DEPRECATED (never written by the V2 sender); sending = claimed before POST';

-- Une seule opération par séance/route d'une version : deux contenus divergents ne peuvent pas être réservés.
CREATE UNIQUE INDEX IF NOT EXISTS nv2_ops_session_unique
  ON public.nolio_v2_operations (plan_version_id, session_key, path);

CREATE OR REPLACE FUNCTION public.nolio_v2_claim_operation(
  p_op_key text, p_coach_id uuid, p_plan_version_id uuid, p_session_key text,
  p_path text, p_athlete_ref text, p_payload_sha256 text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE r public.nolio_v2_operations%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plan_versions WHERE id = p_plan_version_id AND coach_id = p_coach_id) THEN
    RAISE EXCEPTION 'nolio_v2_plan_version_not_owned';
  END IF;
  INSERT INTO public.nolio_v2_operations (op_key, coach_id, plan_version_id, session_key, path, athlete_ref, payload_sha256, api_version, state)
  VALUES (p_op_key, p_coach_id, p_plan_version_id, p_session_key, p_path, p_athlete_ref, p_payload_sha256, 'v2', 'sending')
  ON CONFLICT DO NOTHING
  RETURNING * INTO r;
  IF FOUND THEN RETURN jsonb_build_object('claimed', true); END IF;
  SELECT * INTO r FROM public.nolio_v2_operations
   WHERE op_key = p_op_key OR (plan_version_id = p_plan_version_id AND session_key = p_session_key AND path = p_path)
   ORDER BY (op_key = p_op_key) DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'nolio_v2_claim_conflict_unreadable'; END IF;
  IF r.coach_id <> p_coach_id THEN RAISE EXCEPTION 'nolio_v2_ledger_coach_mismatch'; END IF;
  RETURN jsonb_build_object('claimed', false, 'existing', jsonb_build_object(
    'opKey', r.op_key, 'planVersionId', r.plan_version_id, 'sessionKey', r.session_key, 'path', r.path,
    'athleteRef', r.athlete_ref, 'payloadSha256', r.payload_sha256, 'apiVersion', r.api_version,
    'state', r.state, 'remoteId', r.remote_id, 'detail', r.detail));
END $$;

CREATE OR REPLACE FUNCTION public.nolio_v2_transition_operation(
  p_op_key text, p_coach_id uuid, p_from text, p_to text, p_remote_id text, p_detail text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT ((p_from = 'sending' AND p_to IN ('sent_unconfirmed','confirmed','rejected','rate_limited','ambiguous'))
       OR (p_from = 'sent_unconfirmed' AND p_to IN ('confirmed','ambiguous'))
       OR (p_from = 'rate_limited' AND p_to = 'sending')) THEN
    RAISE EXCEPTION 'nolio_v2_transition_forbidden:%->%', p_from, p_to;
  END IF;
  UPDATE public.nolio_v2_operations
     SET state = p_to, remote_id = COALESCE(p_remote_id, remote_id), detail = p_detail, updated_at = now()
   WHERE op_key = p_op_key AND coach_id = p_coach_id AND state = p_from;
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.nolio_v2_claim_operation(text, uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_transition_operation(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_claim_operation(text, uuid, uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_transition_operation(text, uuid, text, text, text, text) TO service_role;
GRANT ALL ON public.nolio_v2_operations TO service_role;