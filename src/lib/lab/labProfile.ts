import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { resolveVlamaxForGoal } from '@/lib/vlamaxResolver';
import { computeVLamaxEffectif } from '@/lib/vlamaxEffectif';
import { resolveCompassSportFocus } from '@/lib/sportMainDeduction';
import { calculateCarbOxidation, calculateFatOxidation, findSteadyStateLactate, findLactateThresholds } from '@/lib/v2/maderMetabolicModel';

export const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** A dated athlete bilan is evidence independently of optional Nolio records. */
export function labCurveSource(input: CoachingCompassInput, sport: 'bike' | 'run', bikeFit: { vo2max: number; vlamax: number } | null, snapshotInPeriod: boolean) {
  if (sport === 'bike' && bikeFit) return { source: 'nolio' as const, input: { ...input, vo2max: bikeFit.vo2max, vlamaxEffectif: { ...input.vlamaxEffectif, value: bikeFit.vlamax } } };
  if (snapshotInPeriod && labMetabolicCurves(input, sport).points.length) return { source: 'bilan' as const, input };
  return null;
}

/** Projection only; the reference is selected upstream by pickReferenceSnapshot. */
export function labProfile(snapshot: DbSnapshot, tests: DbTest[], goal: string, ambition: string): CoachingCompassInput {
  const bike = computeVLamaxEffectif({ athleteId: snapshot.athlete_id, objectif: goal, activeSnapshotId: snapshot.id, snapshots: [snapshot], tests: tests.filter(t => t.athlete_id === snapshot.athlete_id && t.date.slice(0, 10) <= snapshot.date && !/run|cap|course/i.test(t.sport ?? '')), sportOverride: 'velo' });
  const run = resolveVlamaxForGoal({ ...snapshot, sport_main: 'run' });
  const thresholds = positive(snapshot.vo2max) && positive(snapshot.weight_kg) && positive(bike.value) ? findLactateThresholds({ vo2max: snapshot.vo2max, weight: snapshot.weight_kg, vlamax: bike.value }) : null;
  return {
    athleteId: snapshot.athlete_id, objectif: goal, ambition,
    sportFocus: resolveCompassSportFocus(snapshot, { goal }, 'bike'), athleteAge: null,
    snapshotDate: snapshot.date, snapshotUpdatedAt: snapshot.updated_at,
    ftp: positive(snapshot.ftp) ? snapshot.ftp : null, poids: positive(snapshot.weight_kg) ? snapshot.weight_kg : null,
    vo2max: positive(snapshot.vo2max) ? snapshot.vo2max : null, tss7d: snapshot.tss_7d,
    pmax5s: snapshot.pmax_5s, p30sW: snapshot.p30s_w, p60sW: snapshot.p60s_w, map5minW: snapshot.map5min_w,
    vma: snapshot.vma, paceThresholdSecPerKm: snapshot.pace_threshold_sec_per_km,
    runEconomyScore: snapshot.run_economy_score, hrDriftPct: snapshot.run_hr_drift_pct,
    vlamaxEffectif: { value: positive(bike.value) ? bike.value : null, confidence: bike.confidence, source: bike.source },
    vlamaxRunReference: { value: run.value, source: run.value == null ? 'unknown' : 'estimated' },
    tteEffectif: { tte_min: snapshot.tte_observed_min ?? 0, confidence: positive(snapshot.tte_observed_min) ? 1 : 0, source: positive(snapshot.tte_observed_min) ? 'observed' : 'unknown' },
    tteEffectifRun: { tte_min: snapshot.tte_observed_min_run ?? 0, confidence: positive(snapshot.tte_observed_min_run) ? 1 : 0, source: positive(snapshot.tte_observed_min_run) ? 'observed' : 'unknown' },
    criticalMetrics: snapshot.critical_metrics, fatmax: null, wprimeKj: null,
    fatigueEffectif: null, limiterResult: null, potentielPhysiologique: null, strategyResult: null,
    lactateThresholds: thresholds ? { lt1: { watts: thresholds.lt1Power, confidence: 0 }, lt2: { watts: thresholds.lt2Power, confidence: 0 } } : null,
  };
}

export function labMetabolicCurves(input: CoachingCompassInput, sport: 'bike' | 'run') {
  const vlamax = sport === 'run' ? input.vlamaxRunReference?.value : input.vlamaxEffectif.value;
  const missing = [['VO₂max', input.vo2max], ['VLamax de ce sport', vlamax], ['Poids', input.poids]].filter(([, v]) => !positive(v)).map(([name]) => String(name));
  if (!positive(input.vo2max) || !positive(vlamax) || !positive(input.poids)) return { points: [], missing, peak: null };
  const vo2 = input.vo2max, weight = input.poids;
  const points = Array.from({ length: 81 }, (_, i) => {
    const intensity = 20 + i;
    const fat = calculateFatOxidation(intensity, vo2, vlamax, weight) * 60;
    const carbs = calculateCarbOxidation(intensity, vo2, vlamax, weight) * 60;
    return { intensity, fat, carbs, fatEnergy: fat * 9, carbEnergy: carbs * 4, oxygen: vo2 * intensity / 100, lactate: sport === 'bike' ? findSteadyStateLactate(intensity, vo2, vlamax, weight) : null };
  });
  const peak = points.reduce((best, p) => p.fat > best.fat ? p : best, points[0]);
  return { points, missing, peak };
}