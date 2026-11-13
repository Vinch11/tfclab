import type { CoachingCompassInput, RadarAxis } from './types';
import { getTTETargetByAmbition } from '@/lib/physiologicalTargets';
import { computeRunningCompassDiagnostic } from '@/engines/diagnostic';
import type { AmbitionLevel } from '@/types/ambitionLevel';

/** Display-only comparison: keep the triathlon objective and never transfer bike reserves or lipid zones. */
export function buildDisciplineAxes(input: CoachingCompassInput, axes: RadarAxis[]) {
  const ambition = (input.ambition || 'age_group') as AmbitionLevel;
  const runningDiagnostic = computeRunningCompassDiagnostic({
    objectif: input.objectif, ambition, age: input.athleteAge, vma: input.vma,
    vo2max: input.vo2max, vo2Source: 'shared', paceThresholdSecPerKm: input.paceThresholdSecPerKm,
    vlamax: input.vlamaxRunReference ?? null, tte: input.tteEffectifRun ?? null,
    economy: input.runEconomyScore, drift: input.hrDriftPct,
  });
  const run = runningDiagnostic.axes;
  const bike = axes.filter(a => ['vo2max', 'vlamax', 'ftpkg', 'fatmax'].includes(a.key)).map(a => ({ ...a, shortLabel: a.shortLabel.replace(' vélo', ''), ...(a.key === 'vo2max' ? { label: 'VO₂max du bilan · modalité à confirmer', shortLabel: 'VO₂ bilan' } : {}) }));
  const tte = input.sportFocus === 'run' ? null : input.tteEffectif;
  const target = getTTETargetByAmbition(input.objectif, ambition, input.athleteAge);
  const value = tte && Number.isFinite(tte.tte_min) && tte.tte_min > 0 ? tte.tte_min : null;
  bike.push({ key: 'tte', label: 'Endurance au seuil vélo — TTE', shortLabel: 'TTE', value, target, score: value != null && target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0, unit: 'min', source: value != null ? tte?.source : 'unknown', icon: '⏱️', color: 'hsl(var(--primary))' });
  return { bike, run, runningDiagnostic };
}