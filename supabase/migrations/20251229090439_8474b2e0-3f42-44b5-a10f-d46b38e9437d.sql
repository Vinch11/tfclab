-- Add active_snapshot_id column to athletes table for effective profile system
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS active_snapshot_id uuid REFERENCES public.snapshots(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_athletes_active_snapshot ON public.athletes(active_snapshot_id);