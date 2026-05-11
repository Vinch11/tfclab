CREATE POLICY "plan_versions_update_own"
ON public.plan_versions
FOR UPDATE
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());