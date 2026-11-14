/** Read-only report projection: reuse the canonical zones and stored long-session observations. */
import { deriveTrainingZones, estimateRunThresholdPaceSecPerKm, type DerivedZoneSet } from '@/lib/zones/deriveTrainingZones';
import { parseStoredDurability, type StoredDurability } from '@/lib/durability/longSessionDurability';
import type { ReportZoneSet } from '@/lib/athleteProfileReport/types';

function mapZoneSet(set: DerivedZoneSet, sportLabel: string): ReportZoneSet {
  return {
    sportLabel,
    source: set.source,
    confidence: set.confidence,
    anchors: set.anchors ?? [],
    fallbackReason: set.fallbackReason,
    zones: set.zones.map(z => ({
      id: z.id,
      label: z.label,
      condition: z.condition,
      pctRef: `${Math.round(z.pctRef.min)}–${Math.round(z.pctRef.max)} %`,
      refLabel: z.refLabel,
      absolute: z.absolute,
      heartRate: z.heartRate,
      hrPct: z.fcMaxPct ? `${Math.round(z.fcMaxPct.min)}–${Math.round(z.fcMaxPct.max)} %` : null,
    })),
  };
}

/** Same sport-specific zone derivation as the athlete reports; no new physiology. */
export function reportSportZoneSets(payload: any): ReportZoneSet[] {
  const refs = payload?.effectiveRefs;
  const snap = payload?.effectiveSnapshot;
  const paceThreshold = (snap?.pace_threshold_sec_per_km as number | null | undefined)
    ?? estimateRunThresholdPaceSecPerKm(refs?.vma ?? null, payload?.runMLSS?.effectivePct ?? null);
  const sets: ReportZoneSet[] = [];
  if (refs?.ftp) {
    sets.push(mapZoneSet(deriveTrainingZones({
      sport: 'bike',
      ftp: refs.ftp,
      fcMax: refs.fcMax ?? null,
      fcRest: snap?.fc_repos ?? null,
      fcThreshold: snap?.fc_seuil ?? snap?.fc_threshold ?? null,
      vlamax: payload?.vlamax?.value ?? null,
      vo2max: refs.vo2max ?? null,
      weightKg: refs.weightKg ?? null,
    }), 'Vélo'));
  }
  if (refs?.vma || paceThreshold) {
    sets.push(mapZoneSet(deriveTrainingZones({
      sport: 'run',
      vma: refs?.vma ?? null,
      paceThresholdSecPerKm: typeof paceThreshold === 'number' ? paceThreshold : null,
      paceThresholdEstimated: snap?.pace_threshold_sec_per_km == null,
      fcMax: refs?.fcMax ?? null,
      fcRest: snap?.fc_repos ?? null,
      fcThreshold: snap?.fc_seuil ?? snap?.fc_threshold ?? null,
      vlamax: snap?.vlamax_run ?? null,
      vo2max: refs?.vo2max ?? null,
      weightKg: refs?.weightKg ?? null,
    }), 'Course à pied'));
  }
  return sets;
}

export function reportSportDurability(payload: any): StoredDurability {
  return parseStoredDurability(payload?.effectiveSnapshot?.critical_metrics);
}
