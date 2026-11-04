CREATE TABLE public.qa_nolio_v2_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  recipe_code text NOT NULL CHECK (recipe_code = 'QA_TECH_RUN_10MIN_NO_TARGET_REAL_1'),
  trial_date date NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'frozen' CHECK (state IN ('frozen','sending','post_accepted','post_refused','post_unconfirmed')),
  remote_id text CHECK (remote_id IS NULL OR remote_id ~ '^ptrn_[A-Za-z0-9]+$'),
  post_http_status integer CHECK (post_http_status IS NULL OR post_http_status BETWEEN 100 AND 599),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id, recipe_code),
  CHECK (state <> 'post_accepted' OR remote_id IS NOT NULL)
);
COMMENT ON TABLE public.qa_nolio_v2_trials IS 'QA: essai réel unique figé (coach, athlète, recette). Écritures service-role via RPC uniquement.';

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_trials_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'qa_trial_delete_forbidden'; END IF;
  IF NEW.id <> OLD.id OR NEW.coach_id <> OLD.coach_id OR NEW.athlete_id <> OLD.athlete_id OR NEW.recipe_code <> OLD.recipe_code
     OR NEW.trial_date <> OLD.trial_date OR NEW.payload_sha256 <> OLD.payload_sha256 OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'qa_trial_frozen_fields_immutable';
  END IF;
  IF NOT ((OLD.state = 'frozen' AND NEW.state = 'sending')
       OR (OLD.state = 'sending' AND NEW.state IN ('post_accepted','post_refused','post_unconfirmed'))) THEN
    RAISE EXCEPTION 'qa_trial_transition_forbidden:%->%', OLD.state, NEW.state;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER qa_nolio_v2_trials_guard_trg BEFORE UPDATE OR DELETE ON public.qa_nolio_v2_trials
  FOR EACH ROW EXECUTE FUNCTION public.qa_nolio_v2_trials_guard();

REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_trials FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, coach_id, athlete_id, recipe_code, trial_date, payload_sha256, state, created_at, updated_at) ON public.qa_nolio_v2_trials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.qa_nolio_v2_trials TO service_role;
ALTER TABLE public.qa_nolio_v2_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_trials_select_own ON public.qa_nolio_v2_trials FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE TABLE public.qa_nolio_v2_trial_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.qa_nolio_v2_trials(id),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  recipe_code text NOT NULL CHECK (recipe_code = 'QA_TECH_RUN_10MIN_NO_TARGET_REAL_1'),
  action text NOT NULL CHECK (action IN ('prepare','send','verify')),
  trial_date date NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  http_status integer CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  verdict text NOT NULL CHECK (verdict IN ('PREPARED','POST_ACCEPTED','POST_REFUSED','POST_UNCONFIRMED','VERIFIED_UNIQUE','DUPLICATE','DIVERGENT','ABSENT','UNKNOWN')),
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]{1,64}$'),
  items_read integer CHECK (items_read IS NULL OR items_read >= 0),
  marker_matches integer CHECK (marker_matches IS NULL OR marker_matches >= 0),
  exact_matches integer CHECK (exact_matches IS NULL OR exact_matches >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verdict <> 'VERIFIED_UNIQUE' OR (action = 'verify' AND marker_matches = 1 AND exact_matches = 1 AND items_read >= 1)),
  CHECK (verdict <> 'POST_ACCEPTED' OR (action = 'send' AND http_status = 201)),
  CHECK (verdict <> 'PREPARED' OR action = 'prepare')
);
REVOKE ALL PRIVILEGES ON TABLE public.qa_nolio_v2_trial_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.qa_nolio_v2_trial_receipts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.qa_nolio_v2_trial_receipts TO service_role;
ALTER TABLE public.qa_nolio_v2_trial_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_trial_receipts_select_own ON public.qa_nolio_v2_trial_receipts FOR SELECT TO authenticated USING (coach_id = auth.uid());

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_trial_freeze(p_coach_id uuid, p_athlete_id uuid, p_recipe_code text, p_trial_date date, p_payload_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE r public.qa_nolio_v2_trials%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.athletes WHERE id = p_athlete_id AND coach_id = p_coach_id) THEN RAISE EXCEPTION 'qa_trial_athlete_not_owned'; END IF;
  INSERT INTO public.qa_nolio_v2_trials (coach_id, athlete_id, recipe_code, trial_date, payload_sha256)
  VALUES (p_coach_id, p_athlete_id, p_recipe_code, p_trial_date, p_payload_sha256)
  ON CONFLICT (coach_id, athlete_id, recipe_code) DO NOTHING;
  SELECT * INTO r FROM public.qa_nolio_v2_trials WHERE coach_id = p_coach_id AND athlete_id = p_athlete_id AND recipe_code = p_recipe_code;
  RETURN jsonb_build_object('id', r.id, 'trial_date', r.trial_date, 'payload_sha256', r.payload_sha256, 'state', r.state, 'remote_id', r.remote_id);
END $$;

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_trial_claim_send(p_trial_id uuid, p_coach_id uuid, p_payload_sha256 text)
RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.qa_nolio_v2_trials SET state = 'sending'
   WHERE id = p_trial_id AND coach_id = p_coach_id AND payload_sha256 = p_payload_sha256 AND state = 'frozen';
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.qa_nolio_v2_trial_finish_send(p_trial_id uuid, p_coach_id uuid, p_to text, p_remote_id text, p_http_status integer)
RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF p_to NOT IN ('post_accepted','post_refused','post_unconfirmed') THEN RAISE EXCEPTION 'qa_trial_finish_target_invalid'; END IF;
  UPDATE public.qa_nolio_v2_trials SET state = p_to, remote_id = p_remote_id, post_http_status = p_http_status
   WHERE id = p_trial_id AND coach_id = p_coach_id AND state = 'sending';
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION public.qa_nolio_v2_trial_freeze(uuid, uuid, text, date, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.qa_nolio_v2_trial_claim_send(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.qa_nolio_v2_trial_finish_send(uuid, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.qa_nolio_v2_trials_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_trial_freeze(uuid, uuid, text, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_trial_claim_send(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.qa_nolio_v2_trial_finish_send(uuid, uuid, text, text, integer) TO service_role;