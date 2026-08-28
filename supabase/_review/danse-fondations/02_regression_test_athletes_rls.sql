-- ============================================================================
-- DRAFT — test de non-régression RLS `athletes`, à exécuter APRÈS
-- 01_discipline_roles_athletes_rls.sql sur une base de test/staging
-- (jamais sur prod). Auto-contenu, ROLLBACK à la fin — ne laisse aucune trace.
--
-- Exécution : psql <connexion> -f 02_regression_test_athletes_rls.sql
-- (ou coller dans l'éditeur SQL Supabase, en retirant le ROLLBACK final le
-- temps de lire les NOTICE si besoin de debug).
-- ============================================================================

BEGIN;

-- --- Fixtures ---------------------------------------------------------------
-- Deux coachs triathlon indépendants (comportement actuel : jamais de
-- partage entre eux), un athlète endurance chacun.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'coach.tri.a@test.local'),
  ('00000000-0000-0000-0000-00000000a002', 'coach.tri.b@test.local'),
  ('00000000-0000-0000-0000-00000000d001', 'coach.danse@test.local'),
  ('00000000-0000-0000-0000-00000000d002', 'kine.danse@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.athletes (id, coach_id, name, discipline) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000a001', 'Triathlete A', 'endurance'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000a002', 'Triathlete B', 'endurance'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000d001', 'Danseur X', 'danse')
ON CONFLICT (id) DO NOTHING;

-- Rôles danse : coach.danse@test.local = 'coach' sur discipline danse.
-- kine.danse@test.local = 'kine' sur discipline danse.
INSERT INTO public.user_roles (user_id, discipline, role) VALUES
  ('00000000-0000-0000-0000-00000000d001', 'danse', 'coach'),
  ('00000000-0000-0000-0000-00000000d002', 'danse', 'kine')
ON CONFLICT DO NOTHING;

-- --- Helper : simule une requête authentifiée sous un user_id donné --------
CREATE OR REPLACE FUNCTION pg_temp.as_user(_uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$ LANGUAGE plpgsql;

-- --- TEST 1 : comportement triathlon INCHANGÉ --------------------------------
-- Coach A ne voit que son propre athlète endurance — jamais celui du Coach B,
-- jamais le danseur — exactement comme avant cette migration.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
DO $$
DECLARE visible_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO visible_ids FROM public.athletes;
  IF visible_ids IS DISTINCT FROM ARRAY['10000000-0000-0000-0000-000000000001'::uuid] THEN
    RAISE EXCEPTION 'RÉGRESSION TRIATHLON : Coach A voit %, attendu uniquement son propre athlète', visible_ids;
  END IF;
  RAISE NOTICE 'OK — Coach A ne voit que son propre athlète endurance (%).', visible_ids;
END $$;

-- Coach B, symétriquement.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000a002');
DO $$
DECLARE visible_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO visible_ids FROM public.athletes;
  IF visible_ids IS DISTINCT FROM ARRAY['10000000-0000-0000-0000-000000000002'::uuid] THEN
    RAISE EXCEPTION 'RÉGRESSION TRIATHLON : Coach B voit %, attendu uniquement son propre athlète', visible_ids;
  END IF;
  RAISE NOTICE 'OK — Coach B ne voit que son propre athlète endurance (%).', visible_ids;
END $$;

-- --- TEST 2 : le rôle danse ne donne AUCUN accès aux lignes endurance ------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000d001');
DO $$
DECLARE visible_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO visible_ids FROM public.athletes WHERE discipline = 'endurance';
  IF visible_ids IS NOT NULL THEN
    RAISE EXCEPTION 'FUITE CROSS-DISCIPLINE : coach danse voit des lignes endurance : %', visible_ids;
  END IF;
  RAISE NOTICE 'OK — coach danse ne voit aucune ligne endurance.';
END $$;

-- --- TEST 3 : le rôle danse donne bien accès aux lignes danse --------------
DO $$
DECLARE visible_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO visible_ids FROM public.athletes WHERE discipline = 'danse';
  IF visible_ids IS DISTINCT FROM ARRAY['10000000-0000-0000-0000-000000000003'::uuid] THEN
    RAISE EXCEPTION 'ACCÈS DANSE CASSÉ : coach danse voit %, attendu le danseur X', visible_ids;
  END IF;
  RAISE NOTICE 'OK — coach danse voit bien le danseur de sa discipline.';
END $$;

-- --- TEST 4 : un utilisateur sans AUCUN rôle danse (ni coach_id triathlon)
-- ne voit rien du tout — pas de fuite par défaut.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000e001', 'nobody@test.local')
ON CONFLICT (id) DO NOTHING;
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000e001');
DO $$
DECLARE visible_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO visible_ids FROM public.athletes;
  IF visible_ids IS NOT NULL THEN
    RAISE EXCEPTION 'DENY-BY-DEFAULT CASSÉ : utilisateur sans rôle voit %', visible_ids;
  END IF;
  RAISE NOTICE 'OK — utilisateur sans coach_id ni rôle danse ne voit rien.';
END $$;

-- --- TEST 5 : discipline est immuable après création --------------------
-- Le coach A (propriétaire) tente de repasser son propre athlète endurance
-- en 'danse' — le trigger doit silencieusement annuler le changement.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
DO $$
DECLARE result_discipline public.discipline;
BEGIN
  UPDATE public.athletes SET discipline = 'danse'
    WHERE id = '10000000-0000-0000-0000-000000000001';
  SELECT discipline INTO result_discipline FROM public.athletes
    WHERE id = '10000000-0000-0000-0000-000000000001';
  IF result_discipline IS DISTINCT FROM 'endurance' THEN
    RAISE EXCEPTION 'IMMUABILITÉ CASSÉE : discipline est passée à %', result_discipline;
  END IF;
  RAISE NOTICE 'OK — le trigger a bien empêché le changement de discipline.';
END $$;

-- --- TEST 6 : un coach triathlon "nu" (aucun rôle danse) ne peut PAS créer
-- une ligne discipline='danse' pour lui-même -------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.athletes (id, coach_id, name, discipline)
    VALUES ('10000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-00000000a001', 'Tentative', 'danse');
    RAISE EXCEPTION 'FUITE INSERT : un coach triathlon sans rôle danse a pu créer une ligne danse';
  EXCEPTION
    WHEN insufficient_privilege OR others THEN
      IF SQLERRM LIKE '%FUITE INSERT%' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'OK — insertion danse refusée pour un coach triathlon sans rôle danse (%).', SQLERRM;
  END;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ TOUS LES TESTS RLS athletes SONT VERTS.'; END $$;

ROLLBACK;
