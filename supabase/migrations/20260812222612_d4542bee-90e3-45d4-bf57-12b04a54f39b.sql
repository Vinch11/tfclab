-- 1. Harden is_staff_coach: strictly self-scoped, no NULL-auth branch
CREATE OR REPLACE FUNCTION public.is_staff_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'STAFF_COACH'
      AND _user_id = auth.uid()
  );
$function$;

REVOKE ALL ON FUNCTION public.is_staff_coach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_coach(uuid) TO authenticated, service_role;

-- 2. Ownership scoping for nolio_workout_overrides
ALTER TABLE public.nolio_workout_overrides
  ADD COLUMN IF NOT EXISTS coach_id uuid DEFAULT auth.uid();

UPDATE public.nolio_workout_overrides
SET coach_id = (SELECT p.user_id FROM public.profiles p WHERE p.role = 'STAFF_COACH' ORDER BY p.created_at LIMIT 1)
WHERE coach_id IS NULL;

ALTER TABLE public.nolio_workout_overrides ALTER COLUMN coach_id SET NOT NULL;

DROP POLICY IF EXISTS "Staff can read overrides" ON public.nolio_workout_overrides;
DROP POLICY IF EXISTS "Staff can insert overrides" ON public.nolio_workout_overrides;
DROP POLICY IF EXISTS "Staff can update overrides" ON public.nolio_workout_overrides;
DROP POLICY IF EXISTS "Staff can delete overrides" ON public.nolio_workout_overrides;

CREATE POLICY "Owner staff can read overrides"
  ON public.nolio_workout_overrides FOR SELECT TO authenticated
  USING (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()));

CREATE POLICY "Owner staff can insert overrides"
  ON public.nolio_workout_overrides FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()));

CREATE POLICY "Owner staff can update overrides"
  ON public.nolio_workout_overrides FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()))
  WITH CHECK (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()));

CREATE POLICY "Owner staff can delete overrides"
  ON public.nolio_workout_overrides FOR DELETE TO authenticated
  USING (coach_id = auth.uid() AND public.is_staff_coach(auth.uid()));