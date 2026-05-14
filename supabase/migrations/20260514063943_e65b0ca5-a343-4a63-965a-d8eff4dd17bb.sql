-- Add race time fields to snapshots (Raw data from race chronos)
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS time_5k_sec integer,
  ADD COLUMN IF NOT EXISTS time_5k_date date,
  ADD COLUMN IF NOT EXISTS time_10k_sec integer,
  ADD COLUMN IF NOT EXISTS time_10k_date date,
  ADD COLUMN IF NOT EXISTS time_20k_sec integer,
  ADD COLUMN IF NOT EXISTS time_20k_date date,
  ADD COLUMN IF NOT EXISTS time_half_sec integer,
  ADD COLUMN IF NOT EXISTS time_half_date date,
  ADD COLUMN IF NOT EXISTS time_marathon_sec integer,
  ADD COLUMN IF NOT EXISTS time_marathon_date date,
  ADD COLUMN IF NOT EXISTS race_times_notes text;