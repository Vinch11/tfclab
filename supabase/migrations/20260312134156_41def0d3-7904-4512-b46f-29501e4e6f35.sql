
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS running_power_1s numeric NULL,
  ADD COLUMN IF NOT EXISTS running_power_5s numeric NULL,
  ADD COLUMN IF NOT EXISTS running_power_30s numeric NULL,
  ADD COLUMN IF NOT EXISTS running_power_60s numeric NULL,
  ADD COLUMN IF NOT EXISTS running_power_5min numeric NULL;
