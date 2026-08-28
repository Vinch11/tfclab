-- ============================================================================
-- SCRIPT COMBINÉ — DRY RUN UNIQUE, TRANSACTION UNIQUE, ROLLBACK GARANTI.
--
-- Ce fichier fusionne, dans le bon ordre et SANS transactions imbriquées :
--   01_discipline_roles_athletes_rls.sql   (DDL : enums, colonne, user_roles,
--                                            helpers, policies athletes, trigger)
--   03_injuries_availability_status.sql    (DDL : injuries, availability_status)
--   02_regression_test_athletes_rls.sql    (fixtures + 6 tests, sans son
--                                            BEGIN/ROLLBACK propre)
--   04_regression_test_injuries_isolation.sql (fixtures + 5 tests, sans son
--                                            BEGIN/ROLLBACK propre)
--
-- Pourquoi un fichier combiné : exécuter les 4 fichiers séparément dans UNE
-- même session (comme le nécessite l'option "coller dans l'éditeur SQL, tout
-- en une fois, contre la prod avec ROLLBACK forcé") est dangereux si chaque
-- fichier garde son propre BEGIN/ROLLBACK : le ROLLBACK du fichier 02
-- annulerait le DDL des fichiers 01/03 AVANT que le fichier 04 (qui dépend
-- de ce DDL — has_discipline_role, is_medical_role, injuries,
-- availability_status) ne puisse s'exécuter, provoquant un échec en cascade.
-- Ici : UN SEUL BEGIN en tête, UN SEUL ROLLBACK à la fin. Tout — le DDL et
-- les tests — s'exécute dans la même transaction, puis est annulé d'un bloc.
-- Aucune trace ne subsiste en base, quel que soit le résultat (succès ou
-- échec sur une assertion RAISE EXCEPTION, qui interrompt la transaction et
-- déclenche de toute façon un rollback implicite de Postgres).
--
-- CE SCRIPT NE MODIFIE RIEN DE FAÇON PERMANENTE. Il sert uniquement à
-- prouver, sur la base réelle (schéma + données réelles), que :
--   1. Le DDL s'applique sans erreur (pas de conflit de nom, pas de colonne
--      manquante sur auth.users, etc.)
--   2. Les 11 tests (6 dans le bloc "athletes RLS" + 5 dans le bloc
--      "isolation médicale") passent tous — chacun affiche un "OK — ..."
--      via RAISE NOTICE, et échoue bruyamment (RAISE EXCEPTION, transaction
--      annulée) si un comportement attendu n'est pas respecté.
--
-- À la fin : deux lignes "✅ TOUS LES TESTS ... SONT VERTS." doivent
-- apparaître si tout est correct. Coller l'intégralité de la sortie
-- (NOTICE + erreur éventuelle) telle quelle pour rapport.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1/4 — 01_discipline_roles_athletes_rls.sql (DDL)
-- ============================================================================

-- 1. Enums (additifs, aucune table existante affectée)
CREATE TYPE public.discipline AS ENUM ('endurance', 'danse');
CREATE TYPE public.discipline_role AS ENUM ('admin', 'direction', 'preparateur', 'kine', 'coach');

-- 2. Colonne discipline sur athletes — additive, défaut sûr, aucun backfill
--    manuel nécessaire (toutes les lignes triathlon existantes deviennent
--    'endurance' automatiquement).
ALTER TABLE public.athletes
  ADD COLUMN discipline public.discipline NOT NULL DEFAULT 'endurance';

-- Note : `coach_id` reste NOT NULL (aucune modif de contrainte existante) et
-- doit être renseigné à la création d'une ligne danse (convention : l'id de
-- la personne qui crée la ligne). Mais pour discipline='danse', `coach_id`
-- N'EST PAS le mécanisme d'autorisation — les policies ci-dessous accordent
-- l'accès danse par appartenance à user_roles, jamais par coach_id = auth.uid()
-- seul. Une ligne danse reste donc visible/modifiable par tout le staff
-- habilité, quel que soit qui figure comme coach_id.

-- 3. Entitlements — qui a quel rôle sur quelle discipline.
--    Écriture réservée service_role : pas de flux d'auto-attribution dans
--    cette tâche (même garde-fou que profiles.role après le fix du 27/08 —
--    ici on l'a directement dès la création, pas de policy UPDATE self-service
--    du tout).
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline public.discipline NOT NULL,
  role public.discipline_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, discipline, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Deny-by-default : uniquement lecture de ses propres lignes. Aucune policy
-- INSERT/UPDATE/DELETE pour 'authenticated' → seule service_role peut écrire
-- (Supabase: service_role bypass RLS nativement, pas besoin de policy dédiée).
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- 4. Helpers SECURITY DEFINER (même pattern que is_staff_coach existant).
--    SECURITY DEFINER + search_path fixé : contournent volontairement la RLS
--    de user_roles pour être appelables depuis les policies d'autres tables
--    (sinon RLS-sur-RLS = résultat toujours vide/faux).
CREATE OR REPLACE FUNCTION public.has_discipline_role(
  _user_id uuid,
  _discipline public.discipline,
  _roles public.discipline_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.discipline = _discipline
      AND ur.role = ANY(_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_discipline_role(uuid, public.discipline, public.discipline_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_discipline_role(uuid, public.discipline, public.discipline_role[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_medical_role(_user_id uuid, _discipline public.discipline)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_discipline_role(_user_id, _discipline, ARRAY['kine', 'admin']::public.discipline_role[]);
$$;

REVOKE ALL ON FUNCTION public.is_medical_role(uuid, public.discipline) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_medical_role(uuid, public.discipline) TO authenticated;

-- 5. Remplacement des 4 policies `athletes` — LE SEUL ENDROIT où cette
--    migration touche à du comportement triathlon existant.
--
--    Invariant : pour toute ligne discipline='endurance', le prédicat se
--    réduit exactement à `coach_id = auth.uid()` — identique bit-à-bit au
--    comportement actuel. La branche discipline='danse' est un OR qui ne
--    peut jamais élargir l'accès aux lignes endurance (court-circuité par
--    la comparaison discipline = 'danse'). Voir les tests plus bas pour la
--    preuve exécutable.
DROP POLICY IF EXISTS athletes_select_own ON public.athletes;
DROP POLICY IF EXISTS athletes_insert_own ON public.athletes;
DROP POLICY IF EXISTS athletes_update_own ON public.athletes;
DROP POLICY IF EXISTS athletes_delete_own ON public.athletes;

CREATE POLICY athletes_select ON public.athletes
  FOR SELECT
  USING (
    coach_id = auth.uid()
    OR (
      discipline = 'danse'
      AND public.has_discipline_role(
        auth.uid(), 'danse',
        ARRAY['admin', 'direction', 'preparateur', 'coach', 'kine']::public.discipline_role[]
      )
    )
  );

-- INSERT : le WITH CHECK contraint aussi `discipline`, pas seulement
-- `coach_id` — sinon un simple coach triathlon (coach_id = auth.uid(), aucun
-- rôle danse) pourrait créer une ligne discipline='danse' pour lui-même,
-- visible ensuite par tout le staff danse malgré son absence de rôle. Un
-- coach "nu" (sans rôle danse) ne peut donc créer que des lignes endurance.
CREATE POLICY athletes_insert ON public.athletes
  FOR INSERT
  WITH CHECK (
    (coach_id = auth.uid() AND discipline = 'endurance')
    OR (
      discipline = 'danse'
      AND public.has_discipline_role(
        auth.uid(), 'danse',
        ARRAY['admin', 'preparateur', 'coach']::public.discipline_role[]
      )
    )
  );

CREATE POLICY athletes_update ON public.athletes
  FOR UPDATE
  USING (
    coach_id = auth.uid()
    OR (
      discipline = 'danse'
      AND public.has_discipline_role(
        auth.uid(), 'danse',
        ARRAY['admin', 'preparateur', 'coach']::public.discipline_role[]
      )
    )
  )
  WITH CHECK (
    -- discipline est de toute façon repassée à OLD.discipline par le trigger
    -- BEFORE UPDATE ci-dessous avant que ce WITH CHECK ne s'exécute — même
    -- forme resserrée conservée ici en défense en profondeur, au cas où le
    -- trigger serait un jour retiré par erreur.
    (coach_id = auth.uid() AND discipline = 'endurance')
    OR (
      discipline = 'danse'
      AND public.has_discipline_role(
        auth.uid(), 'danse',
        ARRAY['admin', 'preparateur', 'coach']::public.discipline_role[]
      )
    )
  );

CREATE POLICY athletes_delete ON public.athletes
  FOR DELETE
  USING (
    coach_id = auth.uid()
    OR (
      discipline = 'danse'
      AND public.has_discipline_role(auth.uid(), 'danse', ARRAY['admin']::public.discipline_role[])
    )
  );

-- 6. Immuabilité de `discipline` — même pattern que
--    prevent_self_role_escalation() (profiles.role, migration 20260827065948) :
--    un trigger BEFORE UPDATE, pas un WITH CHECK référençant l'ancienne ligne
--    (fragile en RLS Postgres). Décidé : discipline ne change JAMAIS après
--    création, même par un rôle par ailleurs autorisé à modifier la ligne —
--    évite qu'une ligne danse/endurance bascule par erreur de saisie. Seul
--    service_role peut la changer (migration corrective manuelle si besoin
--    réel un jour).
CREATE OR REPLACE FUNCTION public.prevent_discipline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.discipline IS DISTINCT FROM OLD.discipline AND COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.discipline := OLD.discipline;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_discipline_change() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS prevent_discipline_change_trigger ON public.athletes;
CREATE TRIGGER prevent_discipline_change_trigger
BEFORE UPDATE ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_discipline_change();

-- ============================================================================
-- PARTIE 2/4 — 03_injuries_availability_status.sql (DDL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- injuries — dossier médical brut. Système scellé : AUCUNE policy pour un
-- rôle 'coach' ou 'preparateur', quelle que soit la discipline. Deny-by-
-- default réel (pas de USING(true) nulle part).
-- discipline n'est PAS dupliquée ici (cf. décision : dérivée via JOIN sur
-- athletes.discipline — une seule source de vérité, pas de risque de
-- désynchronisation si un athlète change... sauf qu'on vient de rendre
-- discipline immuable, donc ce risque est de toute façon nul désormais).
-- ----------------------------------------------------------------------------
CREATE TABLE public.injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id),
  injury_type text NOT NULL,
  description text,
  severity text CHECK (severity IN ('leger', 'modere', 'severe')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolue')),
  restriction text,           -- consignes d'entraînement liées (texte libre médical)
  date_reported date NOT NULL DEFAULT CURRENT_DATE,
  date_resolved date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX injuries_athlete_idx ON public.injuries(athlete_id);

ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY injuries_select ON public.injuries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = injuries.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE POLICY injuries_insert ON public.injuries
  FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = injuries.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE POLICY injuries_update ON public.injuries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = injuries.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = injuries.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE POLICY injuries_delete ON public.injuries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = injuries.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE TRIGGER update_injuries_updated_at
  BEFORE UPDATE ON public.injuries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- availability_status — statut dérivé, coarse, PAS le diagnostic. Table
-- séparée écrite par Kiné/Admin (jamais une vue calculée sur `injuries` :
-- une vue partagerait le même risque de fuite qu'une policy trop large sur
-- la table source elle-même — une table distincte, alimentée manuellement
-- par le rôle médical, est la frontière la plus défendable).
--
-- Une ligne = le statut ACTUEL de l'athlète (pas d'historique dans cette
-- tâche — hors périmètre "fondations", cf. brief : pas de dashboard/logique
-- de lecture pour l'instant, seulement la table + RLS).
-- ----------------------------------------------------------------------------
CREATE TABLE public.availability_status (
  athlete_id uuid PRIMARY KEY REFERENCES public.athletes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'limite', 'indisponible')),
  note text,                  -- consigne courte non-diagnostique (ex. "repos genou"), PAS le détail médical —
                               -- convention d'usage, non technique : la table ne peut pas empêcher qu'un Kiné
                               -- y colle du diagnostic par erreur, seule une revue humaine le peut.
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_status ENABLE ROW LEVEL SECURITY;

-- Lecture élargie : Préparateur + Coach + Kiné + Admin, scopée discipline.
CREATE POLICY availability_status_select ON public.availability_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = availability_status.athlete_id
        AND public.has_discipline_role(
          auth.uid(), a.discipline,
          ARRAY['admin', 'direction', 'preparateur', 'coach', 'kine']::public.discipline_role[]
        )
    )
  );

-- Écriture restreinte : Kiné + Admin uniquement (même frontière que injuries).
CREATE POLICY availability_status_insert ON public.availability_status
  FOR INSERT
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = availability_status.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE POLICY availability_status_update ON public.availability_status
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = availability_status.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = availability_status.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

CREATE POLICY availability_status_delete ON public.availability_status
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = availability_status.athlete_id
        AND public.is_medical_role(auth.uid(), a.discipline)
    )
  );

-- ============================================================================
-- PARTIE 3/4 — 02_regression_test_athletes_rls.sql (fixtures + tests, sans
-- son BEGIN/ROLLBACK propre — on est déjà dans la transaction unique ouverte
-- en tête de ce fichier).
-- ============================================================================

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

-- ============================================================================
-- PARTIE 4/4 — 04_regression_test_injuries_isolation.sql (fixtures + tests,
-- sans son BEGIN/ROLLBACK propre).
-- ============================================================================

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

-- ============================================================================
-- FIN — annulation garantie de TOUT ce qui précède (DDL + fixtures), quel
-- que soit le résultat des tests. Rien ne subsiste en base après ce script.
-- ============================================================================
ROLLBACK;
