DO $$
DECLARE target RECORD; prev RECORD;
BEGIN
  FOR target IN SELECT id, athlete_id FROM public.snapshots WHERE source = 'nolio-records' AND date = '2026-06-26' LOOP
    SELECT * INTO prev FROM public.snapshots
      WHERE athlete_id = target.athlete_id AND id <> target.id AND date < '2026-06-26'
      ORDER BY date DESC, created_at DESC LIMIT 1;
    IF FOUND THEN
      UPDATE public.snapshots SET
        weight_kg = COALESCE(weight_kg, prev.weight_kg),
        fat_pct = COALESCE(fat_pct, prev.fat_pct),
        vo2max = COALESCE(vo2max, prev.vo2max),
        ftp = COALESCE(ftp, prev.ftp),
        p30s_w = COALESCE(p30s_w, prev.p30s_w),
        p60s_w = COALESCE(p60s_w, prev.p60s_w),
        map5min_w = COALESCE(map5min_w, prev.map5min_w),
        tte_observed_min = COALESCE(tte_observed_min, prev.tte_observed_min),
        tte_observed_min_run = COALESCE(tte_observed_min_run, prev.tte_observed_min_run),
        tte_mode = COALESCE(tte_mode, prev.tte_mode),
        pace_threshold_sec_per_km = COALESCE(pace_threshold_sec_per_km, prev.pace_threshold_sec_per_km),
        running_power_threshold = COALESCE(running_power_threshold, prev.running_power_threshold),
        running_power_max = COALESCE(running_power_max, prev.running_power_max),
        running_power_1s = COALESCE(running_power_1s, prev.running_power_1s),
        running_power_5s = COALESCE(running_power_5s, prev.running_power_5s),
        running_power_30s = COALESCE(running_power_30s, prev.running_power_30s),
        running_power_60s = COALESCE(running_power_60s, prev.running_power_60s),
        running_power_5min = COALESCE(running_power_5min, prev.running_power_5min),
        fc_repos = COALESCE(fc_repos, prev.fc_repos),
        objectif = COALESCE(objectif, prev.objectif),
        sport_main = COALESCE(sport_main, prev.sport_main),
        vlamax = COALESCE(vlamax, prev.vlamax),
        vlamax_run = COALESCE(vlamax_run, prev.vlamax_run),
        vlamax_source = COALESCE(vlamax_source, prev.vlamax_source),
        vlamax_protocol = COALESCE(vlamax_protocol, prev.vlamax_protocol),
        protocol_quality = COALESCE(protocol_quality, prev.protocol_quality),
        metabolic_profile = COALESCE(metabolic_profile, prev.metabolic_profile),
        run_economy_score = COALESCE(run_economy_score, prev.run_economy_score),
        run_economy_label = COALESCE(run_economy_label, prev.run_economy_label),
        carb_tolerance_band = COALESCE(carb_tolerance_band, prev.carb_tolerance_band),
        fatigue_state = COALESCE(fatigue_state, prev.fatigue_state),
        updated_at = now()
      WHERE id = target.id;
    END IF;
  END LOOP;
END $$;