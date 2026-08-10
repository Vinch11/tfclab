
CREATE OR REPLACE FUNCTION public.is_staff_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'STAFF_COACH'
  );
$$;

-- literature_cohort_versions: staff-only writes
DROP POLICY IF EXISTS "owner insert versions" ON public.literature_cohort_versions;
DROP POLICY IF EXISTS "owner delete versions" ON public.literature_cohort_versions;
CREATE POLICY "staff insert versions" ON public.literature_cohort_versions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_staff_coach(auth.uid()));
CREATE POLICY "staff delete versions" ON public.literature_cohort_versions
  FOR DELETE TO authenticated
  USING (public.is_staff_coach(auth.uid()));

-- nolio_structures_generated: staff-only writes
DROP POLICY IF EXISTS "Authenticated can insert nolio structures" ON public.nolio_structures_generated;
DROP POLICY IF EXISTS "Authenticated can update nolio structures" ON public.nolio_structures_generated;
DROP POLICY IF EXISTS "Authenticated can delete nolio structures" ON public.nolio_structures_generated;
CREATE POLICY "Staff can insert nolio structures" ON public.nolio_structures_generated
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_coach(auth.uid()));
CREATE POLICY "Staff can update nolio structures" ON public.nolio_structures_generated
  FOR UPDATE TO authenticated USING (public.is_staff_coach(auth.uid())) WITH CHECK (public.is_staff_coach(auth.uid()));
CREATE POLICY "Staff can delete nolio structures" ON public.nolio_structures_generated
  FOR DELETE TO authenticated USING (public.is_staff_coach(auth.uid()));

-- nolio_workout_overrides: staff-only writes
DROP POLICY IF EXISTS "Authenticated can insert overrides" ON public.nolio_workout_overrides;
DROP POLICY IF EXISTS "Authenticated can update overrides" ON public.nolio_workout_overrides;
DROP POLICY IF EXISTS "Authenticated can delete overrides" ON public.nolio_workout_overrides;
CREATE POLICY "Staff can insert overrides" ON public.nolio_workout_overrides
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_coach(auth.uid()));
CREATE POLICY "Staff can update overrides" ON public.nolio_workout_overrides
  FOR UPDATE TO authenticated USING (public.is_staff_coach(auth.uid())) WITH CHECK (public.is_staff_coach(auth.uid()));
CREATE POLICY "Staff can delete overrides" ON public.nolio_workout_overrides
  FOR DELETE TO authenticated USING (public.is_staff_coach(auth.uid()));

-- plan_generation_stats: own rows only (staff can read all)
DROP POLICY IF EXISTS "auth read all plan stats" ON public.plan_generation_stats;
CREATE POLICY "read own plan stats" ON public.plan_generation_stats
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_coach(auth.uid()));
