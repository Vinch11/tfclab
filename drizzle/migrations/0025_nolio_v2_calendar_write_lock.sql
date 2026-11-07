-- Serialize requests across saved versions sharing a provider calendar.
-- 60 s exceeds the endpoint's fixed 35 s deadline. Every create has its own
-- durable operation reservation; an expired lease never retries an uncertain op.
CREATE TABLE public.nolio_v2_calendar_write_locks (
  coach_id uuid NOT NULL,
  athlete_ref text NOT NULL CHECK (athlete_ref ~ '^usr_[A-Za-z0-9]+$'),
  plan_version_id uuid NOT NULL,
  request_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (coach_id, athlete_ref)
);
ALTER TABLE public.nolio_v2_calendar_write_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nolio_v2_calendar_write_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.nolio_v2_calendar_write_locks TO service_role;

CREATE FUNCTION public.nolio_v2_begin_calendar_write(
  p_coach_id uuid, p_athlete_ref text, p_plan_version_id uuid, p_request_id uuid
) RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plan_versions WHERE id=p_plan_version_id AND coach_id=p_coach_id) THEN
    RAISE EXCEPTION 'nolio_v2_plan_version_not_owned';
  END IF;
  INSERT INTO public.nolio_v2_calendar_write_locks AS l
    (coach_id,athlete_ref,plan_version_id,request_id,expires_at)
    VALUES (p_coach_id,p_athlete_ref,p_plan_version_id,p_request_id,clock_timestamp()+interval '60 seconds')
  ON CONFLICT (coach_id,athlete_ref) DO UPDATE SET
    plan_version_id=EXCLUDED.plan_version_id,request_id=EXCLUDED.request_id,expires_at=EXCLUDED.expires_at
  WHERE l.expires_at < clock_timestamp();
  RETURN FOUND;
END $$;

CREATE FUNCTION public.nolio_v2_end_calendar_write(
  p_coach_id uuid, p_athlete_ref text, p_plan_version_id uuid, p_request_id uuid
) RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM public.nolio_v2_calendar_write_locks
  WHERE coach_id=p_coach_id AND athlete_ref=p_athlete_ref
    AND plan_version_id=p_plan_version_id AND request_id=p_request_id;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.nolio_v2_begin_calendar_write(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.nolio_v2_end_calendar_write(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nolio_v2_begin_calendar_write(uuid,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.nolio_v2_end_calendar_write(uuid,text,uuid,uuid) TO service_role;
