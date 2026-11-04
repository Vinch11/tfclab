-- Append-only : retirer les privilèges hérités par défaut (RLS bloquait déjà, défense en profondeur).
REVOKE ALL ON public.det_coach_review_contexts FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.det_coach_review_contexts FROM authenticated;