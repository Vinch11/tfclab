-- ====== PRO TTE MODULES ======
alter table public.snapshots
add column if not exists tss_7d integer,
add column if not exists tte_mode text,
add column if not exists tte_observed_min integer;

-- constraints
alter table public.snapshots
add constraint snapshots_tss_7d_range
check (tss_7d is null or (tss_7d >= 0 and tss_7d <= 3000));

alter table public.snapshots
add constraint snapshots_tte_observed_range
check (tte_observed_min is null or (tte_observed_min >= 10 and tte_observed_min <= 120));

alter table public.snapshots
add constraint snapshots_tte_mode_allowed
check (tte_mode is null or tte_mode in ('LOAD','OBSERVED'));