import type { CoachingCompassInput, RadarAxis } from './types';
import { getVLamaxRange, getVmaTargetByAmbition } from '@/lib/physiologicalTargets';
import { getPerformanceAgeFactor } from '@/lib/v2/unifiedLimiterDetection';
import { scoreRelativeToTarget, scoreRelativeToTargetInverse } from './computeCoachingCompass';
import type { AmbitionLevel } from '@/types/ambitionLevel';

/** Display-only comparison: keep the triathlon objective and never transfer bike reserves or lipid zones. */
export function buildDisciplineAxes(input: CoachingCompassInput, axes: RadarAxis[]) {
  const ambition = (input.ambition || 'age_group') as AmbitionLevel;
  const targetBase = getVmaTargetByAmbition(input.objectif, ambition);
  const vmaTarget = targetBase ? Math.round(targetBase * getPerformanceAgeFactor(input.athleteAge) * 100) / 100 : null;
  const range = getVLamaxRange(input.objectif, ambition, 'cap');
  const runVla = input.vlamaxRunReference;
  const vlaValue = runVla?.value && runVla.value > 0 ? runVla.value : null;
  const vo2 = axes.find(a => a.key === 'vo2max');
  const vla = axes.find(a => a.key === 'vlamax');
  const run: RadarAxis[] = [];
  // A single stored VO₂max is a common reference, not two independent sport tests.
  if (vo2) run.push({ ...vo2, label: 'VO₂max du bilan · modalité à confirmer', shortLabel: 'VO₂ bilan', value: input.vo2max || null, score: input.vo2max ? vo2.score : 0, source: input.vo2max ? 'snapshot' : 'unknown' });
  if (vla) run.push({ ...vla, label: 'VLamax course', shortLabel: 'VLamax', value: vlaValue, target: range.optimal, score: vlaValue != null ? scoreRelativeToTargetInverse(vlaValue, range.optimal) : 0, source: vlaValue != null ? runVla?.source : 'unknown' });
  run.push({ key: 'vma', label: 'Vitesse maximale aérobie course', shortLabel: 'VMA', value: input.vma && input.vma > 0 ? input.vma : null, target: vmaTarget, score: scoreRelativeToTarget(input.vma, vmaTarget), unit: 'km/h', source: input.vma ? 'snapshot' : 'unknown', icon: '🏃', color: 'hsl(var(--primary))' });
  const bike = axes.filter(a => ['vo2max', 'vlamax', 'ftpkg', 'fatmax'].includes(a.key)).map(a => ({ ...a, shortLabel: a.shortLabel.replace(' vélo', ''), ...(a.key === 'vo2max' ? { label: 'VO₂max du bilan · modalité à confirmer', shortLabel: 'VO₂ bilan' } : {}) }));
  return { bike, run };
}