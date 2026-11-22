import { describe, expect, it } from 'vitest';
import { compareProfileAxis, contextualCohortFor, buildProfileComparisons } from '../profileComparison';
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from '../types';
const input = { objectif: 'IM', ambition: 'competitor', paceThresholdSecPerKm: 330 } as CoachingCompassInput;
const axis = (key: string, value: number | null, target: number | null): RadarAxis => ({ key, label: key, shortLabel: key, value, target, score: 0, unit: 'km/h', source: 'snapshot', icon: '', color: '' });
describe('Display-only compass references', () => {
  it('does not replace a missing value with a zero-position deficit', () => {
    const result = compareProfileAxis(axis('vma', null, 15), 'run', input);
    expect(result.value).toBeNull(); expect(result.position).toBeNull(); expect(result.status).toBe('missing');
  });
  it('keeps 14.2 visible when the Ironman VMA reference is not established', () => {
    const result = compareProfileAxis(axis('vma', 14.2, null), 'run', input);
    expect(result.value).toBe(14.2); expect(result.reference).toBeNull(); expect(result.status).toBe('unavailable');
  });
  it('does not certify coaching targets as cohort statistics', () => {
    expect(compareProfileAxis(axis('tte', 40, 55), 'run', input).reference).toMatchObject({ kind: 'coaching', evidence: 'extrapolation' });
  });
  it('uses a two-sided sport-specific VLamax interval, not lower-is-always-better', () => {
    expect(compareProfileAxis(axis('vlamax', .2, .32), 'run', input).status).toBe('below');
    expect(compareProfileAxis(axis('vlamax', .32, .32), 'run', input).status).toBe('inside');
    expect(compareProfileAxis(axis('vlamax', .5, .32), 'run', input).status).toBe('above');
    expect(compareProfileAxis(axis('vlamax', .32, .32), 'run', input).reference?.low).toBe(.25);
    expect(compareProfileAxis(axis('vlamax', .32, .26), 'bike', input).reference?.low).toBe(.2);
  });
  it('limits the published treadmill cohort to contextual running comparisons', () => {
    expect(contextualCohortFor('bike', 'IM')).toBeNull(); expect(contextualCohortFor('run', 'Marathon')).toBeNull();
    const cohort = contextualCohortFor('run', 'IM');
    expect(cohort?.metrics.vma).toEqual({ mean: 16.69, sd: 1.65, unit: 'km/h' });
    expect(cohort?.sampleSize).toBe(13); expect(cohort?.ambitionMapping).toBe('indirect');
  });
  it('preserves all input values and does not move bike targets into running', () => {
    const compass = { presentation: { sport: 'triathlon', disciplineAxes: { bike: [axis('ftpkg', 3, 4)], run: [axis('vma', 14.2, null)] } } } as TFCLCoachingCompassResult;
    const before = structuredClone({ input, compass });
    const result = buildProfileComparisons(input, compass);
    expect(result[1].metrics.map(m => m.key)).toEqual(['vma', 'threshold']);
    expect(result[1].metrics[1].value).toBe(330);
    expect({ input, compass }).toEqual(before);
  });
  it.each(['run', 'bike'] as const)('keeps a single %s profile in its own discipline', sport => {
    const compass = { presentation: { sport, axes: [axis(sport === 'run' ? 'vma' : 'ftpkg', 14, 15)], runningDiagnostic: sport === 'run' ? { axes: [axis('vma', 14, 15)] } : undefined } } as TFCLCoachingCompassResult;
    const result = buildProfileComparisons(input, compass);
    expect(result.map(g => g.sport)).toEqual([sport]);
    expect(result[0].metrics.some(m => m.key === 'threshold')).toBe(sport === 'run');
  });
});
import { computeCoachingCompass } from '../computeCoachingCompass';
import { OBJECTIVE_DEMANDS } from '../objectiveDemands';
import { AMBITION_DEFINITIONS } from '@/types/ambitionLevel';
import { getTTETargetByAmbition } from '@/lib/physiologicalTargets';
it.each(Object.entries(OBJECTIVE_DEMANDS))('resolves %s for all five ambition levels', (objectif, demands) => {
  for (const ambition of Object.values(AMBITION_DEFINITIONS)) {
    const athlete: CoachingCompassInput = { ...input, objectif, ambition: ambition.id, athleteAge: 42,
      sportFocus: demands.kind === 'tri' ? 'triathlon' : 'run',
      vlamaxEffectif: {value:null, source:'unknown', confidence:0},
      tteEffectif: {tte_min:40, source:'observed', confidence:.95},
      tteEffectifRun: {tte_min:35, source:'observed', confidence:.95} };
    const groups = buildProfileComparisons(athlete, computeCoachingCompass(athlete));
    expect(groups.map(g => g.sport)).toEqual(demands.kind === 'tri' ? ['bike','run'] : ['run']);
    for (const group of groups) {
      const tte = group.metrics.find(m => m.key === 'tte');
      expect(tte?.value).toBe(demands.kind === 'tri' && group.sport === 'run' ? 35 : 40);
      expect(tte?.reference?.low ?? null).toBe(demands.kind === 'beginner' ? null : getTTETargetByAmbition(objectif, ambition.id, 42));
      expect(group.metrics.some(m => m.key === 'wprime' || m.key === 'durability')).toBe(false);
    }
  }
});
it('retains bounds and conflicting field efforts without plotting an exact TTE', () => {
  const gap = {metric:'TTE', fieldBounds:{low:30,high:null}, gap:0, weightedImpact:0};
  const bike = {...input, sportFocus:'triathlon' as const, limiterResult:{primaryLimiter:'none',confidence:.4,gapAnalysis:[gap]}};
  expect(compareProfileAxis(axis('tte', 45, 55),'bike',bike)).toMatchObject({value:null, observationLabel:'≥ 30 min'});
  expect(compareProfileAxis(axis('tte', 45, 55),'run',bike).observationLabel).toBeUndefined();
  expect(compareProfileAxis(axis('tte', 45, 55),'bike',{...bike,limiterResult:{...bike.limiterResult,gapAnalysis:[{...gap,fieldBoundsConflict:true}]}})).toMatchObject({value:null, observationLabel:'Essais contradictoires'});
});
