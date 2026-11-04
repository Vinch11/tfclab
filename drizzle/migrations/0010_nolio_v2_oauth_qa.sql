CREATE TABLE public.nolio_v2_oauth_states (
  state_digest text PRIMARY KEY CHECK (state_digest ~ '^[a-f0-9]{64}$'),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  return_path text NOT NULL CHECK (return_path = '/__qa/pilot-review'),
  pkce_verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nolio_v2_oauth_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  status text NOT NULL CHECK (status IN ('pending_athlete_selection','pending_refs')),
  api_version text NOT NULL CHECK (api_version = 'v2'),
  app_type text NOT NULL CHECK (app_type IN ('partner','team')),
  granted_scopes text[] NOT NULL,
  nolio_user_ref text NOT NULL,
  allowed_athletes jsonb NOT NULL,
  selected_athlete_ref text,
  consent_confirmed_at timestamptz,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);
REVOKE ALL PRIVILEGES ON TABLE public.nolio_v2_oauth_states, public.nolio_v2_oauth_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nolio_v2_oauth_states, public.nolio_v2_oauth_grants TO service_role;
ALTER TABLE public.nolio_v2_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nolio_v2_oauth_grants ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.nolio_v2_oauth_states IS 'QA Nolio V2 OAuth: state digest only, one-use, service_role only';
COMMENT ON TABLE public.nolio_v2_oauth_grants IS 'QA Nolio V2 OAuth: verified grants never active; nolio_v2_connections untouched; service_role only';