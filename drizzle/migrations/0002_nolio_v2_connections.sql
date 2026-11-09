CREATE TABLE public.nolio_v2_connections (
  user_id uuid PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.nolio_v2_connections TO service_role;
ALTER TABLE public.nolio_v2_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nolio_v2_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL,
  code_verifier text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
);
GRANT ALL ON public.nolio_v2_oauth_states TO service_role;
ALTER TABLE public.nolio_v2_oauth_states ENABLE ROW LEVEL SECURITY;