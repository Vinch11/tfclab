import { AMBITION_DEFINITIONS } from "@/types/ambitionLevel";
import { getVLamaxRange, isKnownPhysiologicalObjective, normalizeObjective } from '@/lib/physiologicalTargets';
import type { AmbitionLevel } from '@/types/ambitionLevel';
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from './types';
import { comparePerformance, readPerformanceGoal } from './performanceComparison';
import { getVmaReference } from './vmaReference';
import { compassDisplaySport } from './sportPresentation';
import { contextualTriathlonCohort } from './referenceRegistry';

export interface ProfileComparison {
  key: string; label: string; value: number | null; unit: string; source: string;
  observationLabel?: string;
  reference: { low: number; high: number; kind: 'coaching' | 'cohort' | 'goal'; evidence: 'extrapolation' | 'observed_mean' | 'race_speed'; note?: string } | null;
  status: 'below' | 'inside' | 'above' | 'unavailable' | 'missing';
  position: number | null; lowPosition: number | null; highPosition: number | null;
  scaleMin: number; scaleMax: number;
}

const labels: Record<string, string> = { raceSpeed: 'Allure course', vo2max: 'VO₂max', vma: 'VMA', vlamax: 'VLamax', ftpkg: 'Seuil / poids', tte: 'TTE', fatmax: 'FatMax', threshold: 'Allure au seuil' };
const positive = (n: number | null | undefined) => n != null && Number.isFinite(n) && n > 0 ? n : null;

export function compareProfileAxis(axis: RadarAxis, sport: 'run' | 'bike', input: CoachingCompassInput, contextualReference?: NonNullable<ProfileComparison['reference']>): ProfileComparison {
  const isTte = axis.key === 'tte';
  const diagnosisSport = compassDisplaySport(input) === 'run' || input.sportFocus === 'run' ? 'run' : 'bike';
  const hold = isTte && sport === diagnosisSport ? input.limiterResult?.gapAnalysis.find(g => g.metric === 'TTE') : undefined;
  const bounds = hold?.fieldBounds;
  const observationLabel = hold?.fieldBoundsConflict ? 'Essais contradictoires'
    : bounds && (bounds.low != null || bounds.high != null) ? (bounds.low != null && bounds.high != null
      ? bounds.low + '–' + bounds.high : bounds.low != null ? '≥ ' + bounds.low : '≤ ' + bounds.high) + ' min'
    : undefined;
  const fromTrainingLoad = isTte && !['observed', 'records', 'test_labo', 'test', 'test_terrain'].includes(axis.source ?? '');
  const value = fromTrainingLoad || observationLabel ? null : positive(axis.value);
  const applicable = isKnownPhysiologicalObjective(input.objectif) && normalizeObjective(input.objectif) !== 'StartToRun' &&
    Object.prototype.hasOwnProperty.call(AMBITION_DEFINITIONS, input.ambition) &&
    (input.athleteAge == null || (Number.isFinite(input.athleteAge) && input.athleteAge >= 18 && input.athleteAge <= 100));
  const target = applicable ? positive(axis.target) : null;
  // The current matrices are coaching constructions; a bibliography does not validate each cell.
  const range = axis.key === 'vlamax' && target != null
    ? getVLamaxRange(input.objectif, (input.ambition || 'age_group') as AmbitionLevel, sport === 'run' ? 'run' : 'bike') : null;
  const reference: ProfileComparison['reference'] = (applicable ? contextualReference : undefined) ?? (target == null ? null : {
    low: range?.min ?? target, high: range?.max ?? target, kind: 'coaching', evidence: 'extrapolation',
  });
  const numbers = [value, reference?.low, reference?.high].filter((n): n is number => n != null);
  const min = numbers.length ? Math.min(...numbers) : 0;
  const max = numbers.length ? Math.max(...numbers) : 1;
  const span = Math.max(max - min, max * .3, .1);
  const scaleMin = Math.max(0, min - span * .35);
  const scaleMax = max + span * .35;
  const position = (n: number) => (n - scaleMin) / (scaleMax - scaleMin) * 100;
  return {
    key: axis.key, observationLabel, label: labels[axis.key] ?? axis.shortLabel, value, unit: axis.unit, source: axis.source ?? 'unknown', reference,
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
    const goal = readPerformanceGoal(input.performanceGoal);
    const performance = comparePerformance(input, goal);
    const cohort = sport === 'run' ? performance.cohort : null;
    const metrics = axes.map(axis => {
      const reference = axis.key === 'vo2max' && cohort ? {
        kind: 'cohort' as const, evidence: 'observed_mean' as const, low: cohort.vo2, high: cohort.vo2,
        note: performance.cohortSource + ' · ' + cohort.label + ' · moyenne ± écart-type ' + cohort.vo2 + ' ± ' + cohort.vo2Sd + ' ml/kg/min',
      } : undefined;
      if (axis.key === 'vma' && axis.target == null && sport === 'run') {
        const scenario = getVmaReference(input.objectif, input.ambition);
        if (scenario) return compareProfileAxis(axis, sport, input, {
          low: scenario.low, high: scenario.high, kind: 'coaching', evidence: 'extrapolation',
          note: scenario.context + ' · estimation à partir de la cohorte de Gordon et al. (2017). Le graphique utilise le bas du scénario.',
        });
      }
      return compareProfileAxis(axis, sport, input, reference);
    });
    if (sport === 'run' && performance.speed && performance.distance && !performance.distance.tri) {
      const observed = positive(input.performanceObservation?.seconds);
      metrics.push(compareProfileAxis({ key: 'raceSpeed', label: 'Vitesse de course', shortLabel: 'Course', unit: 'km/h',
        value: observed ? performance.distance.km * 3600 / observed : null, source: 'snapshot', target: performance.speed,
        score: 0, icon: '', color: '' }, sport, input, { low: performance.speed, high: performance.speed, kind: 'goal', evidence: 'race_speed',
          note: 'Distance officielle divisée par le chrono visé. Le point du bilan utilise le chrono enregistré sur la même distance.' }));
    }
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