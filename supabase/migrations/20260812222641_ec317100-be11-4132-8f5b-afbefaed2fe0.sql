CREATE OR REPLACE FUNCTION public.is_staff_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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