import type { DbSnapshot } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from './types';
import { completeProfile } from './completeProfile';
import { deriveTrainingZones } from '@/lib/zones/deriveTrainingZones';
import { scoreToMlKgKm } from '@/lib/runningEconomySimple';
import { intensityToPowerWatts, findLactateThresholds } from '@/lib/v2/maderMetabolicModel';

export type CurveStatus = 'measured' | 'estimated' | 'recorded';
export type ProfileCurveMetric = 'vo2max' | 'vlamax' | 'threshold' | 'economy';
export const CURVE_STATUS_LABELS: Record<CurveStatus, string> = { measured: 'Mesure documentée', estimated: 'Estimation', recorded: 'Enregistrée · à vérifier' };
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Explicit field provenance, not a test name, reliability score or import origin. */
export function curveStatus(snapshot: DbSnapshot, field: string): CurveStatus {
  const raw = object(snapshot);
  const metadata = object(object(raw.field_sources)[field]);
  const source = String(metadata.source ?? object(raw.field_sources)[field] ?? (field === 'vlamax' ? snapshot.vlamax_source : field === 'run_economy_score' ? raw.run_economy_score_source : '')).toLowerCase();
  if (/estimat|model|blend|calcul/.test(source)) return 'estimated';
  if (/^(lab|labo|laboratory|measured|mesure|mesuré)$/.test(source) && typeof metadata.protocol === 'string' && metadata.protocol.trim() && typeof metadata.sensor === 'string' && metadata.sensor.trim()) return 'measured';
  return 'recorded';
}

export function profileCurveHistory(snapshots: DbSnapshot[], athleteId: string, sport: 'bike' | 'run', metric: ProfileCurveMetric, referenceDate: string | null) {
  const field = metric === 'vo2max' ? 'vo2max' : metric === 'vlamax' ? sport === 'run' ? 'vlamax_run' : 'vlamax' : metric === 'threshold' ? sport === 'run' ? 'pace_threshold_sec_per_km' : 'ftp' : 'run_economy_score';
  if (metric === 'economy' && sport === 'bike') return [];
  return snapshots.filter(s => s.athlete_id === athleteId && (!referenceDate || s.date <= referenceDate)).sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id)).map(s => {
    const value = object(s)[field];
    const status = curveStatus(s, field);
    const formatted = positive(value) ? metric === 'threshold' && sport === 'run' ? 3600 / value : value : null;
    return { id: s.id, date: s.date, value: formatted, status, measured: status === 'measured' ? formatted : null, estimated: status === 'estimated' ? formatted : null, recorded: status === 'recorded' ? formatted : null };
  });
}

/** Display-only oxygen demand. No lactate kinetics or VLamax-to-intensity curve is invented. */
export function oxygenDemandCurve(input: CoachingCompassInput, sport: 'bike' | 'run') {
  if (!positive(input.vo2max)) return [];
  const vo2max = input.vo2max;
  if (sport === 'run') {
    if (!positive(input.vma) || !positive(input.runEconomyScore) || input.runEconomyScore > 100) return [];
    const cost = scoreToMlKgKm(input.runEconomyScore);
    const vma = input.vma;
    return Array.from({ length: 31 }, (_, i) => {
      const speed = vma * (0.4 + i * 0.02);
      return { intensity: Number(speed.toFixed(2)), oxygen: Number((cost * speed / 60).toFixed(2)) };
    });
  }
  if (!positive(input.poids) || !positive(input.ftp)) return [];
  const weight = input.poids;
  return Array.from({ length: 31 }, (_, i) => {
    const pct = 40 + i * 2;
    return { intensity: intensityToPowerWatts(pct, vo2max, weight, 0.23), oxygen: Number((vo2max * pct / 100).toFixed(2)) };
  });
}

export function profileCurveDiscipline(input: CoachingCompassInput, sport: 'bike' | 'run') {
  const discipline = completeProfile(input).find(d => d.sport === (sport === 'run' ? 'Course à pied' : 'Vélo'));
  const vlamax = discipline?.indicators.find(i => i.key === 'vlamax')?.value ?? null;
  const zones = deriveTrainingZones({ sport, ftp: sport === 'bike' ? input.ftp : null, vma: sport === 'run' ? input.vma : null, paceThresholdSecPerKm: sport === 'run' ? input.paceThresholdSecPerKm : null, vo2max: input.vo2max, vlamax, weightKg: input.poids });
  const reference = sport === 'run' ? positive(input.paceThresholdSecPerKm) ? 3600 / input.paceThresholdSecPerKm : null : positive(input.ftp) ? input.ftp : null;
  const thresholds = sport === 'bike' && positive(input.vo2max) && positive(input.poids) && positive(vlamax) ? findLactateThresholds({ vo2max: input.vo2max, weight: input.poids, vlamax }) : null;
  return { discipline, zones, reference, thresholds, oxygen: oxygenDemandCurve(input, sport) };
}