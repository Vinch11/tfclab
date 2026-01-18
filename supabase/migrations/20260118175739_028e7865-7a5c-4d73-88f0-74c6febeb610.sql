-- Add new power indices fields for VLamax Bike V2 calculation
ALTER TABLE public.snapshots 
ADD COLUMN IF NOT EXISTS p30s_w integer,
ADD COLUMN IF NOT EXISTS p60s_w integer,
ADD COLUMN IF NOT EXISTS map5min_w integer,
ADD COLUMN IF NOT EXISTS protocol_quality integer DEFAULT 3 CHECK (protocol_quality BETWEEN 1 AND 5);

-- Add comments for documentation
COMMENT ON COLUMN public.snapshots.p30s_w IS 'Puissance max 30 secondes en Watts';
COMMENT ON COLUMN public.snapshots.p60s_w IS 'Puissance max 60 secondes en Watts';
COMMENT ON COLUMN public.snapshots.map5min_w IS 'Puissance aérobie maximale 5 minutes en Watts';
COMMENT ON COLUMN public.snapshots.protocol_quality IS 'Qualité du protocole de test (1=faible, 5=excellent)';