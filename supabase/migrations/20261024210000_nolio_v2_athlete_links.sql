-- Additive phase-1 metadata only. No v1 table, secret, calendar or production job is modified.
CREATE TABLE public.nolio_v2_athlete_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  connection_key text NOT NULL CHECK (length(connection_key) BETWEEN 1 AND 100),
  nolio_user_id text NOT NULL CHECK (left(nolio_user_id, 4) = 'usr_' AND length(nolio_user_id) BETWEEN 5 AND 512 AND nolio_user_id !~ '[[:space:][:cntrl:]]'),
  access_status text NOT NULL DEFAULT 'verified' CHECK (access_status IN ('verified', 'denied', 'unavailable')),
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, connection_key, athlete_id),
  UNIQUE (coach_id, connection_key, nolio_user_id)
);
ALTER TABLE public.nolio_v2_athlete_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nolio_v2_athlete_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.nolio_v2_athlete_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nolio_v2_athlete_links TO service_role;
CREATE POLICY nolio_v2_links_select_own ON public.nolio_v2_athlete_links
  FOR SELECT TO authenticated USING (
    coach_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.coach_id = (SELECT auth.uid())
    )
  );
-- Defence for service-role writes too: a foreign athlete cannot be linked even by a buggy caller.
CREATE FUNCTION public.nolio_v2_validate_link() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = NEW.athlete_id AND a.coach_id = NEW.coach_id) THEN
    RAISE EXCEPTION 'athlete_not_owned' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.nolio_v2_validate_link() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER nolio_v2_link_owner_guard BEFORE INSERT OR UPDATE ON public.nolio_v2_athlete_links
  FOR EACH ROW EXECUTE FUNCTION public.nolio_v2_validate_link();
COMMENT ON TABLE public.nolio_v2_athlete_links IS 'Phase 1 local Nolio v2 identity links. Never credentials or sports observations.';
