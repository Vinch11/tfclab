ALTER TABLE public.plan_versions
  ADD COLUMN IF NOT EXISTS validator_score integer,
  ADD COLUMN IF NOT EXISTS validator_grade text,
  ADD COLUMN IF NOT EXISTS validator_summary jsonb;

COMMENT ON COLUMN public.plan_versions.validator_score IS 'F-16: Note globale 0-100 du planValidator TFCL au moment de la sauvegarde.';
COMMENT ON COLUMN public.plan_versions.validator_grade IS 'F-16: Grade A/B/C/D/F dérivé du validator_score.';
COMMENT ON COLUMN public.plan_versions.validator_summary IS 'F-16: Détail des 11 sous-scores + commentaire overall (PlanValidationResult.summary).';