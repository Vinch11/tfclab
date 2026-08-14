ALTER TABLE public.plan_generation_stats
  ADD COLUMN IF NOT EXISTS diversity_ratio numeric,
  ADD COLUMN IF NOT EXISTS distinct_catalog_ids integer,
  ADD COLUMN IF NOT EXISTS max_fiche_repeat integer;