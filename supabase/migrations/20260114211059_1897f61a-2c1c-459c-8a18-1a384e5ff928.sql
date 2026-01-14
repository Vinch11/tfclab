-- Add low_crr_justification column to snapshots table
-- Stores the justification for low 7-day TSS: 'decharge', 'recuperation', or 'faible_adherence'
ALTER TABLE public.snapshots 
ADD COLUMN low_crr_justification text DEFAULT NULL;

-- Add a check constraint to ensure valid values
ALTER TABLE public.snapshots
ADD CONSTRAINT snapshots_low_crr_justification_check 
CHECK (low_crr_justification IS NULL OR low_crr_justification IN ('decharge', 'recuperation', 'faible_adherence'));