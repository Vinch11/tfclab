-- Fix privilege escalation: profiles.role could be self-elevated to
-- STAFF_COACH by any authenticated user.
--
-- The original "Users can update their own profile" policy
-- (20260108192355_b7854a47-...sql) has a USING clause (auth.uid() = user_id)
-- but no WITH CHECK clause. Postgres defaults an UPDATE policy's WITH CHECK
-- to its USING expression when none is given, which only constrains WHICH
-- ROW may be targeted — it does not constrain which COLUMNS may change.
-- Any authenticated user could therefore run:
--   update profiles set role = 'STAFF_COACH' where user_id = auth.uid();
-- and RLS would allow it, since the row still satisfies auth.uid() = user_id
-- after the change. is_staff_coach() (used to gate staff-only reads/writes
-- across literature_cohort_versions, nolio_structures_generated,
-- nolio_workout_overrides, etc.) trusts profiles.role as ground truth, so
-- this let any user grant themselves every staff-only permission in the app.
--
-- Fix: a BEFORE UPDATE trigger pins role back to its previous value unless
-- the write comes from service_role (trusted backend context — no edge
-- function currently changes role, this only future-proofs a real
-- admin-controlled path). Chosen over a WITH CHECK clause referencing the
-- old row (which is awkward/fragile for UPDATE policies in Postgres RLS) —
-- a trigger is the standard, robust pattern for "this column is
-- user-editable except this one sensitive field", and lets unrelated
-- profile edits (display_name, onboarding_completed) keep working via the
-- same update() call without a separate code path.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_self_role_escalation() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS prevent_self_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();
