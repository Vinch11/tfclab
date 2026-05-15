/**
 * mapSnapshotToV2 — Single source of truth for mapping DbSnapshot fields
 * to the V2 Enhanced engine input format.
 * 
 * Use this everywhere a snapshot needs to be passed to computeVLamaxEffectif,
 * to avoid silently dropping fields (the bug that kept recurring).
 */

import type { DbSnapshot } from "@/hooks/useCloudData";

/**
 * Maps a DbSnapshot to the minimal object required by the VLamax V2 Enhanced engine.
 * Includes all bike + running power fields needed for Score G computation.
 */
export function mapSnapshotToV2(s: DbSnapshot) {
  return {
    id: s.id,
    athlete_id: s.athlete_id,
    date: s.date,
    vlamax: s.vlamax,
    vlamax_run: (s as any).vlamax_run ?? null, // ✅ requis pour routing CAP/run dans computeVLamaxEffectif
    ftp: s.ftp,
    pmax_5s: s.pmax_5s,
    weight_kg: s.weight_kg,
    sport_main: s.sport_main,
    // Bike V2 Enhanced
    p30s_w: s.p30s_w,
    p60s_w: s.p60s_w,
    map5min_w: s.map5min_w,
    tte_observed_min: s.tte_observed_min,
    protocol_quality: s.protocol_quality,
    objectif: s.objectif,
    vo2max: s.vo2max,
    // CAP V2 Enhanced — running power & pace
    vma: s.vma,
    pace_threshold_sec_per_km: s.pace_threshold_sec_per_km,
    running_power_threshold: s.running_power_threshold,
    running_power_max: s.running_power_max,
    running_power_1s: s.running_power_1s,
    running_power_5s: s.running_power_5s,
    running_power_30s: s.running_power_30s,
    running_power_60s: s.running_power_60s,
    running_power_5min: s.running_power_5min,
    // CAP unifié — sprint terrain (vlamaxCapEstimator)
    vlamax_source: (s as any).vlamax_source ?? null,
    vlamax_protocol: (s as any).vlamax_protocol ?? null,
    sprint_15s_distance: (s as any).sprint_15s_distance ?? null,
  };
}

/**
 * Maps a test record to the minimal object required by computeVLamaxEffectif.
 */
export function mapTestToV2(t: { athlete_id: string; vlamax: number | null; date: string; type: string; name: string }) {
  return {
    athlete_id: t.athlete_id,
    vlamax: t.vlamax,
    date: t.date,
    type: t.type,
    name: t.name,
  };
}
