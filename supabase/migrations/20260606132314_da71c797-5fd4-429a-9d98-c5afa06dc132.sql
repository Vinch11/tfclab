
DROP POLICY IF EXISTS "auth read profiles" ON public.literature_cohort_profiles;
DROP POLICY IF EXISTS "auth read versions" ON public.literature_cohort_versions;

CREATE POLICY "staff read profiles"
  ON public.literature_cohort_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'STAFF_COACH'));

CREATE POLICY "staff read versions"
  ON public.literature_cohort_versions
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'STAFF_COACH'));
