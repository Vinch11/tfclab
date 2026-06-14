ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS nolio_id integer NULL;
CREATE INDEX IF NOT EXISTS idx_athletes_nolio_id ON public.athletes(nolio_id);