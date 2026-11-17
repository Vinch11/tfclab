import type { DbSnapshot } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { calculateLactateClearance, calculateLactateProduction, findLactateThresholds, findSteadyStateLactate, intensityToPowerWatts } from '@/lib/v2/maderMetabolicModel';
import { generateMaderPowerDurationCurve } from '@/lib/v2/maderPowerDurationCurve';
import { labMetabolicCurves, positive } from './labProfile';

const EFF = 0.23;
export type LabSport = 'bike' | 'run';
export interface LabObserved { key: string; label: string; source: string; intensity: number; value: string; durationSec?: number; watts?: number; modelWatts?: number; gapPct?: number }

/** Read-only intensity grid anchored on the athlete's own TFCL values. */
export function labLoadCharacteristics(input: CoachingCompassInput, sport: LabSport) {
  const base = labMetabolicCurves(input, sport);
  const vlamax = sport === 'run' ? input.vlamaxRunReference?.value : input.vlamaxEffectif.value;
  if (!base.points.length || !positive(vlamax)) return { ...base, rows: [], markers: null };
  const vo2 = input.vo2max!, weight = input.poids!;
  const vma = positive(input.vma) ? input.vma : null;
  const rows = base.points.map(p => {
    const lactate = sport === 'bike' ? findSteadyStateLactate(p.intensity, vo2, vlamax, weight) : null;
    const total = p.fatEnergy + p.carbEnergy;
    return { ...p, watts: sport === 'bike' ? Math.round(intensityToPowerWatts(p.intensity, vo2, weight, EFF)) : null,
      speed: sport === 'run' && vma ? Math.round(vma * p.intensity) / 100 : null,
      production: sport === 'bike' ? calculateLactateProduction(p.intensity, vlamax) : null,
      clearance: sport === 'bike' && lactate != null ? calculateLactateClearance(p.intensity, vo2, lactate) : null,
      fatShare: total > 0 ? (p.fatEnergy / total) * 100 : null, carbShare: total > 0 ? (p.carbEnergy / total) * 100 : null };
  });
  const t = sport === 'bike' ? findLactateThresholds({ vo2max: vo2, weight, vlamax }) : null;
  return { ...base, rows, markers: { lt1: t?.lt1Intensity || null, lt2: t?.lt2Intensity || null, fatmax: base.peak?.intensity ?? null } };
}

/** Aerobic vs anaerobic share per duration from the TFCL power–duration model (cycling only). */
export function labEnergyContribution(input: CoachingCompassInput, sport: LabSport) {
  const vlamax = input.vlamaxEffectif.value;
  if (sport !== 'bike' || !positive(input.vo2max) || !positive(input.poids) || !positive(vlamax)) return [];
  const curve = generateMaderPowerDurationCurve({ vo2max: input.vo2max, vlamax, weight: input.poids }, [5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2700, 3600]);
  if (!positive(curve.cp)) return [];
  return curve.points.map(p => { const aerobic = Math.min(100, (curve.cp / p.powerWatts) * 100); return { durationSec: p.durationSec, label: p.durationLabel, power: p.powerWatts, aerobic, anaerobic: 100 - aerobic }; });
}

/** Stored bilan values (records/Nolio imports) placed on the same axis, with model gap when comparable. */
export function labObservedPoints(snapshot: DbSnapshot, input: CoachingCompassInput, sport: LabSport): LabObserved[] {
  if (!positive(input.vo2max) || !positive(input.poids)) return [];
  const src = 'Bilan ' + snapshot.date + (/nolio/i.test(snapshot.coach_notes ?? '') ? ' · import Nolio' : '');
  if (sport === 'run') {
    const out: LabObserved[] = [];
    if (positive(snapshot.vma)) out.push({ key: 'vma', label: 'VMA', source: src, intensity: 100, value: `${snapshot.vma} km/h` });
    if (positive(snapshot.vma) && positive(snapshot.pace_threshold_sec_per_km)) { const v = 3600 / snapshot.pace_threshold_sec_per_km; out.push({ key: 'thr', label: 'Allure seuil', source: src, intensity: Math.round(v / snapshot.vma * 100), value: `${v.toFixed(1)} km/h` }); }
    return out;
  }
  const vmax = intensityToPowerWatts(100, input.vo2max, input.poids, EFF);
  const vlamax = input.vlamaxEffectif.value;
  const model = positive(vlamax) ? generateMaderPowerDurationCurve({ vo2max: input.vo2max, vlamax, weight: input.poids }, [5, 30, 60, 300, 3600]).points : [];
  const items: [string, string, number | null | undefined, number][] = [['p5', 'Record 5 s', snapshot.pmax_5s, 5], ['p30', 'Record 30 s', snapshot.p30s_w, 30], ['p60', 'Record 1 min', snapshot.p60s_w, 60], ['p300', 'Record 5 min', snapshot.map5min_w, 300], ['ftp', 'FTP', snapshot.ftp, 3600]];
  return items.filter(([, , w]) => positive(w)).map(([key, label, w, d]) => {
    const m = model.find(p => p.durationSec === d)?.powerWatts;
    return { key, label, source: src, durationSec: d, watts: w!, intensity: Math.round(w! / vmax * 100), value: `${Math.round(w!)} W`, modelWatts: m, gapPct: m ? Math.round((w! - m) / m * 100) : undefined };
  });
}
