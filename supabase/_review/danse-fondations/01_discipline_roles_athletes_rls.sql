-- ============================================================================
-- DRAFT — NON APPLIQUÉ. Pour revue avant migration réelle.
-- Fondations discipline/rôles + remplacement des 4 policies `athletes`.
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
--    la comparaison discipline = 'danse'). Voir 02_regression_test.sql pour
--    la preuve exécutable.
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
