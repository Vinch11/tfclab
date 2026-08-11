DROP POLICY IF EXISTS "Authenticated can read nolio structures" ON public.nolio_structures_generated;
CREATE POLICY "Staff can read nolio structures"
ON public.nolio_structures_generated FOR SELECT TO authenticated
USING (public.is_staff_coach(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read overrides" ON public.nolio_workout_overrides;
CREATE POLICY "Staff can read overrides"
ON public.nolio_workout_overrides FOR SELECT TO authenticated
USING (public.is_staff_coach(auth.uid()));

CREATE POLICY "update own plan stats"
ON public.plan_generation_stats FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete own plan stats"
ON public.plan_generation_stats FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_staff_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'STAFF_COACH'
      AND (auth.uid() IS NULL OR p.user_id = auth.uid())
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_staff_coach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_coach(uuid) TO authenticated, service_role;