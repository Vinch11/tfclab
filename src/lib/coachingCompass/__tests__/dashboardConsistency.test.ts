import { describe, expect, it } from 'vitest';
import { computeCoachingCompass, type CoachingCompassInput } from '..';
import { dashboardCoverage, dashboardTargetProgress, relativeCategoryDeficit, hasDashboardNutritionInputs } from '../dashboardConsistency';
import { getEffectiveSnapshot } from '@/lib/effectiveRefs';
import type { DbAthlete, DbSnapshot } from '@/hooks/useCloudData';

const input = (objectif: string, sportFocus: CoachingCompassInput['sportFocus']): CoachingCompassInput => ({
  ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: '2026-11-12', snapshotUpdatedAt: null,
  pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: null, hrDriftPct: null,
  vma: 14.2, paceThresholdSecPerKm: 315, fatmax: null,
  vlamaxEffectif: { value: .2, confidence: .4, source: 'estimated' },
  vlamaxRunReference: { value: null, source: 'unknown' },
  tteEffectif: { tte_min: 35, confidence: .4, source: 'estimated' },
  tteEffectifRun: { tte_min: 40, confidence: .9, source: 'observed' },
  fatigueEffectif: null, limiterResult: null, potentielPhysiologique: null, strategyResult: null,
  lactateThresholds: null, wprimeKj: null, objectif, ambition: 'competitor', sportFocus, athleteAge: 51,
});

describe('Dashboard display contracts', () => {
  it('nutrition never substitutes a missing sport VLamax, VO2max or weight', () => {
    expect(hasDashboardNutritionInputs(50, .2, 52)).toBe(true);
    expect(hasDashboardNutritionInputs(50, null, 52)).toBe(false);
    expect(hasDashboardNutritionInputs(null, .2, 52)).toBe(false);
    expect(hasDashboardNutritionInputs(50, .2, null)).toBe(false);
    expect(hasDashboardNutritionInputs(50, .2, 0)).toBe(false);
  });
  it('35 versus 52 is a 32.69 percent deficit, not 17 percent', () => {
    expect(relativeCategoryDeficit([{ metric: 'TTE', value: 35, target: 52 }])).toBeCloseTo(32.6923, 4);
  });
  it('35 versus 90 is a 61.11 percent deficit, not 55 percent', () => {
    expect(relativeCategoryDeficit([{ metric: 'Durabilité', value: 35, target: 90 }])).toBeCloseTo(61.1111, 4);
  });
  it('empty triathlon coverage is zero, not fifty', () => {
    const data = input('IM', 'triathlon');
    Object.assign(data, { ftp: null, poids: null, vo2max: null, vma: null, paceThresholdSecPerKm: null, vlamaxEffectif: { value: null }, tteEffectif: { tte_min: 0, source: 'unknown' }, tteEffectifRun: null });
    expect(dashboardCoverage(data).score).toBe(0);
  });
  it('course coverage cannot use cycling VLamax to fill missing course VLamax in triathlon', () => {
    const coverage = dashboardCoverage(input('IM', 'triathlon'));
    expect(coverage.manquants).toEqual(['VLamax course']);
    expect(coverage.filled).toBe(8);
    expect(coverage.total).toBe(9);
  });
  it('course coverage does not require or score residual bike FTP', () => {
    const data = input('10K', 'run'); data.vlamaxRunReference = { value: .6, source: 'estimated' };
    expect(dashboardCoverage(data).total).toBe(6);
    const before = dashboardCoverage(data); data.ftp = null;
    expect(dashboardCoverage(data)).toEqual(before);
  });
  it.each(['5K', '10K', 'Semi', 'Marathon', 'Trail', '703', 'IM'])('progress uses visible sport targets and preserves contracts for %s', objectif => {
    const data = input(objectif, ['703', 'IM'].includes(objectif) ? 'triathlon' : 'run');
    const before = structuredClone(data);
    const result = computeCoachingCompass(data);
    const contracts = structuredClone({ limiter: result.limiter, decision: result.decision, readiness: result.readiness });
    const view = result.presentation;
    const axes = view?.disciplineAxes ? [...view.disciplineAxes.bike, ...view.disciplineAxes.run] : view?.runningDiagnostic?.axes ?? view?.axes ?? [];
    const progress = dashboardTargetProgress(axes);
    for (const metric of progress.metrics) {
      expect(axes.some(a => a.key === metric.key && a.value === metric.value && a.target === metric.target)).toBe(true);
      expect(metric.progress).toBeGreaterThanOrEqual(0);
      expect(metric.progress).toBeLessThanOrEqual(100);
    }
    expect(data).toEqual(before);
    expect({ limiter: result.limiter, decision: result.decision, readiness: result.readiness }).toEqual(contracts);
    if (objectif === 'IM') expect(progress.metrics.some(m => m.key === 'vma')).toBe(false);
  });
  it('reference active snapshot outranks newer dates, and ties use creation then id', () => {
    const athlete = { id: 'athlete', active_snapshot_id: 'old' } as DbAthlete;
    const rows = [
      { id: 'old', athlete_id: 'athlete', date: '2026-06-30', created_at: '2026-06-30' },
      { id: 'a', athlete_id: 'athlete', date: '2026-11-12', created_at: '2026-11-12T10:00' },
      { id: 'b', athlete_id: 'athlete', date: '2026-11-12', created_at: '2026-11-12T11:00' },
      { id: 'c', athlete_id: 'athlete', date: '2026-11-12', created_at: '2026-11-12T11:00' },
    ] as DbSnapshot[];
    expect(getEffectiveSnapshot(athlete, rows)?.id).toBe('old');
    athlete.active_snapshot_id = null;
    expect(getEffectiveSnapshot(athlete, rows)?.id).toBe('c');
  });
});