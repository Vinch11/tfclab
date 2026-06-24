ALTER TABLE public.nolio_records
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'nolio'
  CHECK (source IN ('nolio','manual'));
CREATE INDEX IF NOT EXISTS nolio_records_source_idx ON public.nolio_records(source);