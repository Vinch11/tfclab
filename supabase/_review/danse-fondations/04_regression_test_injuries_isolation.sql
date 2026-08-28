-- ============================================================================
-- DRAFT — test d'isolation médicale, la preuve explicite demandée par le
-- brief : "un Coach ne peut jamais lire injuries", y compris cross-
-- discipline. Auto-contenu, ROLLBACK à la fin. À exécuter APRÈS
-- 01_discipline_roles_athletes_rls.sql ET 03_injuries_availability_status.sql
-- sur staging (jamais sur prod).
-- ============================================================================

BEGIN;

-- --- Fixtures ---------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000d001', 'coach.danse@test.local'),
  ('00000000-0000-0000-0000-00000000d002', 'kine.danse@test.local'),
  ('00000000-0000-0000-0000-00000000d003', 'prepa.danse@test.local'),
  ('00000000-0000-0000-0000-00000000d004', 'admin.danse@test.local'),
  ('00000000-0000-0000-0000-00000000k001', 'kine.endurance@test.local'),
  ('00000000-0000-0000-0000-00000000a001', 'coach.tri.a@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.athletes (id, coach_id, name, discipline) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d004', 'Danseur Y', 'danse'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000a001', 'Triathlete C', 'endurance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, discipline, role) VALUES
  ('00000000-0000-0000-0000-00000000d001', 'danse', 'coach'),
  ('00000000-0000-0000-0000-00000000d002', 'danse', 'kine'),
  ('00000000-0000-0000-0000-00000000d003', 'danse', 'preparateur'),
  ('00000000-0000-0000-0000-00000000d004', 'danse', 'admin'),
  ('00000000-0000-0000-0000-00000000k001', 'endurance', 'kine')  -- hypothèse future, endurance n'a pas encore de rôle médical réel
ON CONFLICT DO NOTHING;

-- Une ligne médicale sur le danseur, insérée par le Kiné danse (via service
-- role pour préparer le fixture — les tests ci-dessous portent sur la
-- LECTURE, pas sur le chemin d'écriture, déjà couvert par la policy INSERT).
INSERT INTO public.injuries (athlete_id, reported_by, injury_type, description, severity)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d002', 'Tendinite genou', 'Détail médical sensible', 'modere');

INSERT INTO public.availability_status (athlete_id, status, note, updated_by)
VALUES ('20000000-0000-0000-0000-000000000001', 'limite', 'Repos genou 3j', '00000000-0000-0000-0000-00000000d002');

CREATE OR REPLACE FUNCTION pg_temp.as_user(_uid uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$ LANGUAGE plpgsql;

-- --- TEST 1 (LE test demandé par le brief) : Coach danse NE LIT PAS injuries
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000d001');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.injuries;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FUITE MÉDICALE : Coach danse lit % ligne(s) injuries', n;
  END IF;
  RAISE NOTICE 'OK — Coach danse : 0 ligne injuries visible.';
END $$;

-- --- TEST 2 : Kiné danse LIT bien injuries (accès nécessaire au métier) ---
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000d002');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.injuries WHERE athlete_id = '20000000-0000-0000-0000-000000000001';
  IF n <> 1 THEN
    RAISE EXCEPTION 'ACCÈS MÉDICAL CASSÉ : Kiné danse voit % ligne(s), attendu 1', n;
  END IF;
  RAISE NOTICE 'OK — Kiné danse lit bien la ligne injuries de son athlète.';
END $$;

-- --- TEST 3 : Préparateur danse NE LIT PAS injuries (seulement availability)
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000d003');
DO $$
DECLARE n_injuries int;
DECLARE n_avail int;
BEGIN
  SELECT count(*) INTO n_injuries FROM public.injuries;
  IF n_injuries <> 0 THEN
    RAISE EXCEPTION 'FUITE MÉDICALE : Préparateur lit % ligne(s) injuries', n_injuries;
  END IF;
  SELECT count(*) INTO n_avail FROM public.availability_status WHERE athlete_id = '20000000-0000-0000-0000-000000000001';
  IF n_avail <> 1 THEN
    RAISE EXCEPTION 'AVAILABILITY_STATUS CASSÉ : Préparateur voit % ligne(s), attendu 1', n_avail;
  END IF;
  RAISE NOTICE 'OK — Préparateur : 0 ligne injuries, mais lit bien availability_status (statut dérivé).';
END $$;

-- --- TEST 4 : Kiné ENDURANCE ne lit PAS les injuries d'un athlète DANSE
-- (isolation cross-discipline, explicitement demandée par le brief) --------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000k001');
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.injuries WHERE athlete_id = '20000000-0000-0000-0000-000000000001';
  IF n <> 0 THEN
    RAISE EXCEPTION 'FUITE CROSS-DISCIPLINE : Kiné endurance lit % ligne(s) injuries danse', n;
  END IF;
  RAISE NOTICE 'OK — Kiné endurance ne voit pas les injuries d''un athlète danse.';
END $$;

-- --- TEST 5 : Préparateur danse ne peut PAS écrire dans injuries ----------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000d003');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.injuries (athlete_id, reported_by, injury_type)
    VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000d003', 'Tentative préparateur');
    RAISE EXCEPTION 'FUITE ÉCRITURE : Préparateur a pu insérer dans injuries';
  EXCEPTION
    WHEN insufficient_privilege OR others THEN
      IF SQLERRM LIKE '%FUITE ÉCRITURE%' THEN RAISE; END IF;
      RAISE NOTICE 'OK — écriture injuries refusée pour Préparateur (%).', SQLERRM;
  END;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ TOUS LES TESTS D''ISOLATION MÉDICALE SONT VERTS.'; END $$;

ROLLBACK;
