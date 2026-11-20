import { describe, expect, it } from 'vitest';
import { comparePerformance, readPerformanceGoal, storedPerformance, comparisonGoals } from '../performanceComparison';
const athlete = { objectif: 'Marathon', vma: 16, paceThresholdSecPerKm: 260, vo2max: 50, athleteAge: 42, athleteSex: 'F' };
describe('goal-driven comparison', () => {
  it('selects the observed chrono group, not an ambition label', () => {
    const result = comparePerformance(athlete, { minutes: 187 });
    expect(result.cohort?.vo2).toBe(55.7);
    expect(result.vo2Difference).toBeCloseTo(-5.7);
    expect(result.pace).toBeCloseTo(265.908, 2);
    expect(result.category).toBe('40–44 ans');
  });
  it.each(['IM', '70.3', 'Semi', '10km', 'Trail'])('does not transfer marathon physiology to %s', objectif => {
    expect(comparePerformance({ ...athlete, objectif }, { minutes: 600, runMinutes: 187 }).cohort).toBeNull();
  });
  it('uses the triathlon split, never overall race time, for running demand', () => {
    const result = comparePerformance({ ...athlete, objectif: 'IM' }, { minutes: 600, runMinutes: 240 });
    expect(result.pace).toBeCloseTo(341.27, 1);
    expect(comparePerformance({ ...athlete, objectif: 'IM' }, { minutes: 600 }).speed).toBeNull();
  });
  it('does not infer an objective from missing or invalid data', () => {
    for (const goal of [null, { minutes: 0 }, { minutes: Infinity }, { minutes: 600, runMinutes: 600 }]) expect(readPerformanceGoal(goal)).toBeNull();
    expect(comparePerformance(athlete, null).cohort).toBeNull();
  });
  it('does not extrapolate faster than studied marathon groups', () => {
    expect(comparePerformance(athlete, { minutes: 149 }).cohort).toBeNull();
    expect(comparePerformance(athlete, { minutes: 180 }).cohort?.vo2).toBe(55.7);
  });
  it('leaves missing capabilities unknown and detects incompatible target speed', () => {
    expect(comparePerformance({ ...athlete, vma: null, vo2max: null }, { minutes: 187 }).vmaFraction).toBeNull();
    expect(comparePerformance({ ...athlete, vma: 10 }, { minutes: 187 }).warnings.length).toBeGreaterThan(0);
  });
  it('uses male half-marathon groups only for adult men and in published intervals', () => {
    const input = { ...athlete, objectif: 'Semi', athleteSex: 'M' };
    expect(comparePerformance(input, { minutes: 95 }).cohort?.vo2).toBe(51.9);
    expect(comparePerformance({ ...input, athleteSex: 'F' }, { minutes: 95 }).cohort).toBeNull();
    expect(comparePerformance({ ...input, athleteAge: 15 }, { minutes: 95 }).cohort).toBeNull();
    expect(comparePerformance(input, { minutes: 92.5 }).cohort).toBeNull();
  });
  it('reads only same-distance stored results, preserving unknown dates', () => {
    const snapshot = { time_marathon_sec: 14400, time_marathon_date: '2026-01-01', time_half_sec: 6000 };
    expect(storedPerformance('Marathon', snapshot)).toEqual({ seconds: 14400, date: '2026-01-01' });
    expect(storedPerformance('Semi', snapshot)).toEqual({ seconds: 6000, date: null });
    expect(storedPerformance('IM', snapshot)).toBeNull();
    expect(storedPerformance('10km', snapshot)).toBeNull();
  });
  it('validates persisted goal maps without leaking another ambition', () => {
    expect(comparisonGoals(null)).toEqual({});
    expect(comparisonGoals({ compassPerformance: [] })).toEqual({});
    const refs = { compassPerformance: { 'IM:competitor': { minutes: 600 } } };
    expect(readPerformanceGoal(comparisonGoals(refs)['IM:finisher'])).toBeNull();
    expect(readPerformanceGoal(comparisonGoals(refs)['IM:competitor'])).toEqual({ minutes: 600 });
  });

});
