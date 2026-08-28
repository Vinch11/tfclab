-- ============================================================================
-- DRAFT — NON APPLIQUÉ. Pour revue.
-- Système scellé médical : `injuries` (brut, Kiné+Admin) et
-- `availability_status` (dérivé, coarse, Préparateur+Coach+Kiné+Admin).
--
-- À appliquer APRÈS 01_discipline_roles_athletes_rls.sql (dépend de
-- `discipline`, `user_roles`, `has_discipline_role`, `is_medical_role`).
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
