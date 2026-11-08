-- Nolio API V2 — production : autorisation OAuth par coach, liens athlète,
-- journal durable des créations (Nolio V2 ne déduplique pas les créations).
-- Additif : aucune table V1 (nolio_tokens, …) n'est modifiée.
-- Toutes les tables sont service_role uniquement (aucune policy client),
-- sauf la lecture de son propre journal par le coach.

-- 1) États OAuth (digest du state seul, usage unique, PKCE).
CREATE TABLE IF NOT EXISTS public.nolio_v2_oauth_states (
  state_digest text PRIMARY KEY CHECK (state_digest ~ '^[a-f0-9]{64}$'),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pkce_verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Autorisation Nolio : une par coach (rotation du refresh token sérialisée sur cette ligne).
CREATE TABLE IF NOT EXISTS public.nolio_v2_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  api_version text NOT NULL DEFAULT 'v2' CHECK (api_version = 'v2'),
  app_type text NOT NULL CHECK (app_type IN ('partner','team')),
  granted_scopes text[] NOT NULL,
  nolio_user_ref text NOT NULL CHECK (nolio_user_ref ~ '^usr_[A-Za-z0-9]+$'),
  allowed_athletes jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_token text NOT NULL CHECK (length(access_token) > 0),
  refresh_token text,
  token_expires_at timestamptz NOT NULL,
  token_generation bigint NOT NULL DEFAULT 1,
  refresh_state text NOT NULL DEFAULT 'idle' CHECK (refresh_state IN ('idle','refreshing','needs_reconnect','unknown')),
  refresh_lock_id uuid,
  refresh_lock_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Lien athlète TFCLab ↔ athlète Nolio géré par le compte du coach.
CREATE TABLE IF NOT EXISTS public.nolio_v2_athlete_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  grant_id uuid NOT NULL REFERENCES public.nolio_v2_grants(id) ON DELETE CASCADE,
  nolio_athlete_ref text NOT NULL CHECK (nolio_athlete_ref ~ '^usr_[A-Za-z0-9]+$'),
  nolio_athlete_name text,
  sport_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  remote_sports jsonb NOT NULL DEFAULT '[]'::jsonb,
  refs_loaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);

REVOKE ALL PRIVILEGES ON TABLE public.nolio_v2_oauth_states, public.nolio_v2_grants, public.nolio_v2_athlete_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nolio_v2_oauth_states, public.nolio_v2_grants, public.nolio_v2_athlete_links TO service_role;
ALTER TABLE public.nolio_v2_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nolio_v2_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nolio_v2_athlete_links ENABLE ROW LEVEL SECURITY;

-- 4) Journal durable des opérations (réservation atomique AVANT tout POST).
CREATE TABLE IF NOT EXISTS public.nolio_v2_operations (
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
  CONSTRAINT nv2_state CHECK (state IN ('sending','sent_unconfirmed','confirmed','ambiguous','rejected','rate_limited')),
  CONSTRAINT nv2_athlete_opaque CHECK (athlete_ref ~ '^usr_[A-Za-z0-9]+$'),
  CONSTRAINT nv2_confirmed_has_remote CHECK (state <> 'confirmed' OR remote_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS nv2_ops_plan_idx ON public.nolio_v2_operations (coach_id, plan_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS nv2_ops_session_unique ON public.nolio_v2_operations (plan_version_id, session_key, path);
REVOKE ALL ON public.nolio_v2_operations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.nolio_v2_operations TO authenticated;
GRANT ALL ON public.nolio_v2_operations TO service_role;
ALTER TABLE public.nolio_v2_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nv2_ops_select_own" ON public.nolio_v2_operations;
CREATE POLICY "nv2_ops_select_own" ON public.nolio_v2_operations FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE OR REPLACE FUNCTION public.nolio_v2_claim_operation(
  p_op_key text, p_coach_id uuid, p_plan_version_id uuid, p_session_key text,
  p_path text, p_athlete_ref text, p_payload_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
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
RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
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

-- 5) Connexion / reconnexion explicite (callback) : nouvelle génération, verrou effacé.
CREATE OR REPLACE FUNCTION public.nolio_v2_grant_connect(
  p_coach_id uuid, p_app_type text, p_scopes text[], p_user_ref text,
  p_allowed jsonb, p_access text, p_refresh text, p_expires timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_gen bigint;
BEGIN
  INSERT INTO public.nolio_v2_grants AS g (coach_id, app_type, granted_scopes, nolio_user_ref, allowed_athletes,
    access_token, refresh_token, token_expires_at)
  VALUES (p_coach_id, p_app_type, p_scopes, p_user_ref, p_allowed, p_access, p_refresh, p_expires)
  ON CONFLICT (coach_id) DO UPDATE SET
    app_type = EXCLUDED.app_type, granted_scopes = EXCLUDED.granted_scopes,
    nolio_user_ref = EXCLUDED.nolio_user_ref, allowed_athletes = EXCLUDED.allowed_athletes,
    access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, token_expires_at = EXCLUDED.token_expires_at,
    token_generation = g.token_generation + 1, refresh_state = 'idle', refresh_lock_id = NULL, refresh_lock_until = NULL, updated_at = now()
  RETURNING id, token_generation INTO v_id, v_gen;
  -- Un autre compte Nolio : les liens athlètes de l'ancien compte ne sont plus valides.
  DELETE FROM public.nolio_v2_athlete_links l USING public.nolio_v2_grants g2
   WHERE l.grant_id = v_id AND g2.id = v_id AND NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(g2.allowed_athletes) a WHERE a->>'id' = l.nolio_athlete_ref);
  RETURN jsonb_build_object('ok', true, 'generation', v_gen);
END $$;

-- 6) Rafraîchissement sérialisé (bail durable, génération = fencing token).
CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_begin(p_grant_id uuid, p_expected_generation bigint, p_lock_id uuid, p_lease_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_grants%ROWTYPE;
BEGIN
  IF p_lease_seconds < 5 OR p_lease_seconds > 120 THEN RAISE EXCEPTION 'lease_out_of_range'; END IF;
  SELECT * INTO g FROM public.nolio_v2_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_found'); END IF;
  IF g.refresh_state = 'refreshing' THEN
    IF g.refresh_lock_until <= now() THEN
      UPDATE public.nolio_v2_grants SET refresh_state = 'unknown', refresh_lock_until = NULL, updated_at = now() WHERE id = g.id;
      RETURN jsonb_build_object('ok', false, 'reason', 'refresh_unknown');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'refresh_in_progress');
  END IF;
  IF g.refresh_state = 'needs_reconnect' THEN RETURN jsonb_build_object('ok', false, 'reason', 'needs_reconnect'); END IF;
  IF g.refresh_state = 'unknown' THEN RETURN jsonb_build_object('ok', false, 'reason', 'refresh_unknown'); END IF;
  IF g.token_generation <> p_expected_generation THEN RETURN jsonb_build_object('ok', false, 'reason', 'stale_generation', 'generation', g.token_generation); END IF;
  IF g.refresh_token IS NULL OR length(g.refresh_token) = 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'needs_reconnect'); END IF;
  UPDATE public.nolio_v2_grants SET refresh_state = 'refreshing', refresh_lock_id = p_lock_id,
    refresh_lock_until = now() + make_interval(secs => p_lease_seconds), updated_at = now() WHERE id = g.id;
  RETURN jsonb_build_object('ok', true, 'refresh_token', g.refresh_token, 'generation', g.token_generation);
END $$;

CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_commit(p_grant_id uuid, p_lock_id uuid, p_generation bigint,
  p_access text, p_refresh text, p_expires timestamptz, p_scopes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.nolio_v2_grants%ROWTYPE; v_gen bigint;
BEGIN
  IF p_access IS NULL OR length(p_access) < 8 OR p_refresh IS NULL OR length(p_refresh) < 8 OR p_expires <= now() + interval '60 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'commit_payload_invalid');
  END IF;
  IF NOT (p_scopes @> ARRAY['planned:read','planned:write']) THEN RETURN jsonb_build_object('ok', false, 'reason', 'scopes_missing'); END IF;
  SELECT * INTO g FROM public.nolio_v2_grants WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'grant_not_found'); END IF;
  IF g.refresh_lock_id IS DISTINCT FROM p_lock_id OR g.token_generation <> p_generation OR g.refresh_state NOT IN ('refreshing','unknown') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'fenced');
  END IF;
  v_gen := g.token_generation + 1;
  UPDATE public.nolio_v2_grants SET access_token = p_access, refresh_token = p_refresh, token_expires_at = p_expires,
    granted_scopes = p_scopes, token_generation = v_gen, refresh_state = 'idle', refresh_lock_id = NULL, refresh_lock_until = NULL, updated_at = now()
   WHERE id = g.id;
  RETURN jsonb_build_object('ok', true, 'generation', v_gen);
END $$;

CREATE OR REPLACE FUNCTION public.nolio_v2_refresh_fail(p_grant_id uuid, p_lock_id uuid, p_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  IF p_outcome NOT IN ('needs_reconnect','unknown','released_not_sent') THEN RAISE EXCEPTION 'outcome_invalid'; END IF;
  UPDATE public.nolio_v2_grants SET
    refresh_state = CASE p_outcome WHEN 'released_not_sent' THEN 'idle' ELSE p_outcome END,
    refresh_lock_id = CASE p_outcome WHEN 'unknown' THEN refresh_lock_id ELSE NULL END,
    refresh_lock_until = NULL, updated_at = now()
   WHERE id = p_grant_id AND refresh_lock_id = p_lock_id AND refresh_state = 'refreshing';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n = 1);
END $$;

REVOKE ALL ON FUNCTION public.nolio_v2_claim_operation(text, uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_transition_operation(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_grant_connect(uuid, text, text[], text, jsonb, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_begin(uuid, bigint, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_refresh_fail(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_claim_operation(text, uuid, uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_transition_operation(text, uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_grant_connect(uuid, text, text[], text, jsonb, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_begin(uuid, bigint, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_commit(uuid, uuid, bigint, text, text, timestamptz, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_refresh_fail(uuid, uuid, text) TO service_role;
