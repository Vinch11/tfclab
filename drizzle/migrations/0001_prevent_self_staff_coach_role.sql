-- Empêche un utilisateur de s'attribuer (ou de retirer) lui-même STAFF_COACH.
-- Seuls le service_role et l'administration directe (sans JWT) peuvent gérer ce rôle.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _jwt_role text := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
BEGIN
  -- Serveur de confiance (service_role) ou administration directe sans JWT
  IF _jwt_role = 'service_role' OR (_jwt_role IS NULL AND current_user NOT IN ('anon', 'authenticated')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT DISTINCT FROM 'STAFF_COACH' THEN
      RAISE EXCEPTION 'STAFF_COACH ne peut pas être auto-attribué' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role
        AND (NEW.role IS NOT DISTINCT FROM 'STAFF_COACH' OR OLD.role IS NOT DISTINCT FROM 'STAFF_COACH') THEN
    RAISE EXCEPTION 'Changement de rôle STAFF_COACH réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_self_role_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_self_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Auto-tests exécutés avec le vrai contexte PostgREST (rôle authenticated/anon + JWT),
-- chacun dans une sous-transaction annulée : aucune donnée n'est conservée.
-- Si un test échoue, toute la migration est annulée.
DO $$
DECLARE
  _uid uuid;
  _claims text;
  _failures text := '';
  _ok boolean;
  _msg text;
  _n int;
BEGIN
  SELECT user_id INTO _uid FROM public.profiles ORDER BY created_at LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  _claims := json_build_object('sub', _uid, 'role', 'authenticated')::text;

  -- T1 : athlète loisir -> STAFF_COACH refusé
  BEGIN
    UPDATE public.profiles SET role = 'ATHLETE_LOISIR' WHERE user_id = _uid;
    PERFORM set_config('request.jwt.claims', _claims, true);
    PERFORM set_config('role', 'authenticated', true);
    _ok := false;
    BEGIN
      UPDATE public.profiles SET role = 'STAFF_COACH' WHERE user_id = _uid;
    EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS _msg = MESSAGE_TEXT; _ok := _msg LIKE 'Changement de rôle STAFF_COACH%';
    END;
    IF NOT _ok THEN _failures := _failures || ' T1'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- T2 : loisir -> performance -> loisir, et changement de nom autorisés
  BEGIN
    UPDATE public.profiles SET role = 'ATHLETE_LOISIR' WHERE user_id = _uid;
    PERFORM set_config('request.jwt.claims', _claims, true);
    PERFORM set_config('role', 'authenticated', true);
    _ok := true;
    BEGIN
      UPDATE public.profiles SET role = 'ATHLETE_ELITE' WHERE user_id = _uid;
      GET DIAGNOSTICS _n = ROW_COUNT; IF _n <> 1 THEN _ok := false; END IF;
      UPDATE public.profiles SET role = 'ATHLETE_LOISIR', display_name = 'test' WHERE user_id = _uid;
      GET DIAGNOSTICS _n = ROW_COUNT; IF _n <> 1 THEN _ok := false; END IF;
    EXCEPTION WHEN OTHERS THEN _ok := false;
    END;
    IF NOT _ok THEN _failures := _failures || ' T2'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- T3 : création de profil avec STAFF_COACH refusée ; rôle NULL refusé ; défaut = loisir
  BEGIN
    DELETE FROM public.profiles WHERE user_id = _uid;
    PERFORM set_config('request.jwt.claims', _claims, true);
    PERFORM set_config('role', 'authenticated', true);
    _ok := false;
    BEGIN
      INSERT INTO public.profiles (user_id, role) VALUES (_uid, 'STAFF_COACH');
    EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS _msg = MESSAGE_TEXT; _ok := _msg LIKE 'STAFF_COACH ne peut pas%';
    END;
    IF NOT _ok THEN _failures := _failures || ' T3a'; END IF;
    _ok := false;
    BEGIN
      INSERT INTO public.profiles (user_id, role) VALUES (_uid, NULL);
    EXCEPTION WHEN not_null_violation THEN _ok := true;
    END;
    IF NOT _ok THEN _failures := _failures || ' T3b'; END IF;
    _ok := false;
    BEGIN
      INSERT INTO public.profiles (user_id) VALUES (_uid);
      _ok := (SELECT role FROM public.profiles WHERE user_id = _uid) = 'ATHLETE_LOISIR';
    EXCEPTION WHEN OTHERS THEN _ok := false;
    END;
    IF NOT _ok THEN _failures := _failures || ' T3c'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- T4 : un STAFF_COACH ne peut pas changer son propre rôle
  BEGIN
    UPDATE public.profiles SET role = 'STAFF_COACH' WHERE user_id = _uid;
    PERFORM set_config('request.jwt.claims', _claims, true);
    PERFORM set_config('role', 'authenticated', true);
    _ok := false;
    BEGIN
      UPDATE public.profiles SET role = 'ATHLETE_ELITE' WHERE user_id = _uid;
    EXCEPTION WHEN insufficient_privilege THEN _ok := true;
    END;
    IF NOT _ok THEN _failures := _failures || ' T4'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- T5 : service_role peut attribuer et retirer STAFF_COACH
  BEGIN
    UPDATE public.profiles SET role = 'ATHLETE_LOISIR' WHERE user_id = _uid;
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    PERFORM set_config('role', 'service_role', true);
    _ok := true;
    BEGIN
      UPDATE public.profiles SET role = 'STAFF_COACH' WHERE user_id = _uid;
      UPDATE public.profiles SET role = 'ATHLETE_ELITE' WHERE user_id = _uid;
      UPDATE public.profiles SET role = 'STAFF_COACH' WHERE user_id = _uid;
    EXCEPTION WHEN OTHERS THEN _ok := false;
    END;
    IF NOT _ok THEN _failures := _failures || ' T5'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  -- T6 : visiteur anonyme ne peut ni créer ni modifier un profil
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    PERFORM set_config('role', 'anon', true);
    _ok := false;
    BEGIN
      INSERT INTO public.profiles (user_id, role) VALUES (_uid, 'STAFF_COACH');
    EXCEPTION WHEN OTHERS THEN _ok := true;
    END;
    BEGIN
      UPDATE public.profiles SET role = 'ATHLETE_LOISIR' WHERE user_id = _uid;
      GET DIAGNOSTICS _n = ROW_COUNT; IF _n <> 0 THEN _ok := false; END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    IF NOT _ok THEN _failures := _failures || ' T6'; END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  IF _failures <> '' THEN
    RAISE EXCEPTION 'Auto-tests sécurité rôle échoués :%', _failures USING ERRCODE = 'P0002';
  END IF;
END $$;