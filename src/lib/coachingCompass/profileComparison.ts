import { getVLamaxRange } from '@/lib/physiologicalTargets';
import type { AmbitionLevel } from '@/types/ambitionLevel';
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from './types';
import { contextualTriathlonCohort } from './referenceRegistry';

export interface ProfileComparison {
  key: string; label: string; value: number | null; unit: string; source: string;
  reference: { low: number; high: number; kind: 'coaching'; evidence: 'extrapolation' } | null;
  status: 'below' | 'inside' | 'above' | 'unavailable' | 'missing';
  position: number | null; lowPosition: number | null; highPosition: number | null;
  scaleMin: number; scaleMax: number;
}

const labels: Record<string, string> = { vo2max: 'VO₂max', vma: 'VMA', vlamax: 'VLamax', ftpkg: 'Seuil / poids', tte: 'TTE', fatmax: 'FatMax', threshold: 'Allure au seuil' };
const positive = (n: number | null | undefined) => n != null && Number.isFinite(n) && n > 0 ? n : null;

export function compareProfileAxis(axis: RadarAxis, sport: 'run' | 'bike', input: CoachingCompassInput): ProfileComparison {
  const value = positive(axis.value);
  const target = positive(axis.target);
  // The current matrices are coaching constructions; a bibliography does not validate each cell.
  const range = axis.key === 'vlamax' && target != null
    ? getVLamaxRange(input.objectif, (input.ambition || 'age_group') as AmbitionLevel, sport === 'run' ? 'run' : 'bike') : null;
  const reference: ProfileComparison['reference'] = target == null ? null : {
    low: range?.min ?? target, high: range?.max ?? target, kind: 'coaching', evidence: 'extrapolation',
  };
  const numbers = [value, reference?.low, reference?.high].filter((n): n is number => n != null);
  const min = numbers.length ? Math.min(...numbers) : 0;
  const max = numbers.length ? Math.max(...numbers) : 1;
  const span = Math.max(max - min, max * .3, .1);
  const scaleMin = Math.max(0, min - span * .35);
  const scaleMax = max + span * .35;
  const position = (n: number) => (n - scaleMin) / (scaleMax - scaleMin) * 100;
  return {
    key: axis.key, label: labels[axis.key] ?? axis.shortLabel, value, unit: axis.unit, source: axis.source ?? 'unknown', reference,
    status: value == null ? 'missing' : !reference ? 'unavailable' : value < reference.low ? 'below' : value > reference.high ? 'above' : 'inside',
    position: value == null || !reference ? null : position(value),
    lowPosition: reference ? position(reference.low) : null, highPosition: reference ? position(reference.high) : null,
    scaleMin, scaleMax,
  };
}

export function buildProfileComparisons(input: CoachingCompassInput, compass: TFCLCoachingCompassResult) {
  const view = compass.presentation;
  if (!view) return [];
  const sports: Array<'run' | 'bike'> = view.sport === 'triathlon' ? ['bike', 'run'] : [view.sport];
  return sports.map(sport => {
    const axes = view.disciplineAxes?.[sport] ?? (sport === 'run' ? view.runningDiagnostic?.axes : undefined) ?? view.axes;
    const metrics = axes.map(axis => compareProfileAxis(axis, sport, input));
    // Keep the stored running threshold visible, without inferring a triathlon race pace or target.
    const pace = positive(input.paceThresholdSecPerKm);
    if (sport === 'run' && pace) metrics.push(compareProfileAxis({ key: 'threshold', label: '', shortLabel: '', value: pace, target: null, score: 0, unit: 's/km', source: 'snapshot', icon: '', color: '' }, sport, input));
    return { sport, metrics };
  });
}

export function contextualCohortFor(sport: 'run' | 'bike', objective: string) {
  // Explicitly limited to triathlon contexts; not matched to an ambition or a field protocol.
  return sport === 'run' && /ironman|\bim\b|70[.,]3|half/i.test(objective) ? contextualTriathlonCohort : null;
}