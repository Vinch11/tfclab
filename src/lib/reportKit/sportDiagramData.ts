/** Read-only report projection: reuse the canonical zones and stored long-session observations. */
import { deriveTrainingZones, estimateRunThresholdPaceSecPerKm, type DerivedZoneSet } from '@/lib/zones/deriveTrainingZones';
import { reportFieldEvidence } from './fieldEvidence';
import type { StoredDurability } from '@/lib/durability/longSessionDurability';
import type { ReportZoneSet } from '@/lib/athleteProfileReport/types';

/**
 * Bornes extrêmes lisibles : Z1 n'a pas de plancher et Z6 n'a pas de plafond physiologique.
 * Afficher « 0–132 W » ou « 218–564 W » suggérait des limites qui n'existent pas.
 */
function openEnded(id: string, absolute: string | null, sport: 'bike' | 'run'): string | null {
  if (!absolute) return absolute;
  const parts = absolute.replace(/\/km$| W$/, '').split('–');
  if (parts.length !== 2) return absolute;
  const [low, high] = parts;
  if (sport === 'bike') return id === 'Z1' ? `< ${high} W` : id === 'Z6' ? `> ${low} W` : absolute;
  // Course : la plage est notée « rapide–lent » (min/km).
  return id === 'Z6' ? `plus rapide que ${high}/km` : absolute;
}

function mapZoneSet(set: DerivedZoneSet, sportLabel: string): ReportZoneSet {
  const sport = /course/i.test(sportLabel) ? 'run' : 'bike';
  const rows = set.zones;
  return {
    markers: (set.markers ?? []).map(m => ({ id: m.id, label: m.label, absolute: m.absolute })),
    sportLabel,
    source: set.source,
    confidence: set.confidence,
    anchors: set.anchors ?? [],
    fallbackReason: set.fallbackReason,
    zones: rows.map((z, i) => ({
      id: z.id,
      label: z.label,
      condition: z.condition,
      pctRef: `${Math.round(z.pctRef.min)}–${Math.round(z.pctRef.max)} %`,
      refLabel: z.refLabel,
      // Course Z1 : pas d'allure calculable sous 0 km/h, on l'exprime depuis le bas de Z2.
      absolute: sport === 'run' && z.id === 'Z1' && !z.absolute && rows[i + 1]?.absolute
        ? `plus lent que ${rows[i + 1].absolute!.split('–')[1]}`
        : openEnded(z.id, z.absolute, sport),
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
      raceObjective: payload?.athlete?.goal ?? null,
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
      raceObjective: payload?.athlete?.goal ?? null,
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
  const snapshot = payload?.effectiveSnapshot;
  if (!snapshot || (payload.athlete?.id && snapshot.athlete_id !== payload.athlete.id)) return {};
  return reportFieldEvidence(snapshot).durability;
}
