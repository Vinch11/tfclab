REVOKE EXECUTE ON FUNCTION public.is_staff_coach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_coach(uuid) TO authenticated, service_role;