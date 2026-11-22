import { expect, it } from 'vitest';
import { publishedRaceStatistics } from '../raceStatistics';
import { buildProfileComparisons } from '../profileComparison';
import { computeCoachingCompass } from '../computeCoachingCompass';
import type { CoachingCompassInput } from '../types';

const runner = { objectif: 'Semi', ambition: 'competitor', athleteAge: 42, athleteSex: 'M',
  sportFocus: 'run', tteEffectif: { tte_min: 35, source: 'observed', confidence: .9 }, vo2max: 49, vma: 14, vlamaxEffectif: { value: .57, source: 'estimated', confidence: .6 } } as CoachingCompassInput;
const comparisons = (input: CoachingCompassInput) => buildProfileComparisons(input, computeCoachingCompass(input));
it('selects published race comparisons by population and ambition without a time', () => {
  expect(publishedRaceStatistics(runner)?.scenario?.minutes).toBe(98.8);
  expect(publishedRaceStatistics({ ...runner, ambition: 'age_group' })?.scenario?.minutes).toBe(107.9);
  expect(publishedRaceStatistics({ ...runner, athleteSex: 'F' })?.scenario?.minutes).toBe(107.6);
  expect(publishedRaceStatistics({ ...runner, objectif: 'Marathon', ambition: 'age_group' })?.scenario?.minutes).toBe(244.5);
  for (const ambition of ['finisher', 'elite', 'world_class']) expect(publishedRaceStatistics({ ...runner, ambition })?.scenario).toBeNull();
  for (const input of [{ athleteSex: null }, { athleteAge: 13 }, { athleteAge: 60 }, { objectif: 'Trail' }, { objectif: '70.3' }]) {
    expect(publishedRaceStatistics({ ...runner, ...input })).toBeNull();
  }
  const tri = publishedRaceStatistics({ ...runner, objectif: 'IM', athleteAge: 18 });
  expect(tri?.category).toBe('Hommes 18–24 ans');
  expect(tri?.rows[0].minutes).toBeCloseTo(756 + 7 / 60);
  expect(tri?.scenario).toBeNull();
});
it('shows observed physiology as an indirect comparison and preserves a personal target', () => {
  const vo2 = (input: CoachingCompassInput) => comparisons(input)[0].metrics.find(m => m.key === 'vo2max')?.reference;
  expect(vo2(runner)).toMatchObject({ kind: 'cohort', low: 51.9, note: expect.stringContaining('indirecte') });
  expect(vo2({ ...runner, performanceGoal: { minutes: 90 } })).toMatchObject({ low: 54.5, note: expect.stringContaining('personnel') });
  expect(vo2({ ...runner, athleteSex: 'F' })?.kind).not.toBe('cohort');
  expect(comparisons(runner)[0].metrics.some(m => m.key === 'raceSpeed')).toBe(false);
  const tri = comparisons({ ...runner, objectif: 'IM', sportFocus: 'triathlon' });
  expect(tri[1].metrics.find(m => m.key === 'vma')?.reference).toMatchObject({ low: 16.69, kind: 'cohort' });
  expect(tri[0].metrics.some(m => m.reference?.kind === 'cohort')).toBe(false);
});
