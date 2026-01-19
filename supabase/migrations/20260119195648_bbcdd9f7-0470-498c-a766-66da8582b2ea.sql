-- Add separate VLamax field for running
ALTER TABLE public.snapshots
ADD COLUMN vlamax_run numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.snapshots.vlamax_run IS 'VLamax spécifique course à pied (mmol/L/s), distinct de vlamax (vélo)';