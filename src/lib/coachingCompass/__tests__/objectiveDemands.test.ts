import { describe, expect, it } from 'vitest';
import { OBJECTIVE_DEMANDS, compareDisciplines, olympicCohort } from '../objectiveDemands';
import { comparePerformance, readPerformanceGoal } from '../performanceComparison';
describe('all supported objective demands', () => {
  it('covers every application objective explicitly', () => {
    expect(Object.keys(OBJECTIVE_DEMANDS).sort()).toEqual(['IM','703','Sprint','Olympic','Marathon','Semi','5K','10K','StartToRun','Trail','TrailShort','TrailMountain','TrailUltra'].sort());
  });
  it.each(['IM','703','Sprint','Olympic'])('compares %s disciplines separately', objective => {
    const goal = { minutes: 600, swimMinutes: 60, bikeMinutes: 300, runMinutes: 230, bikeWatts: 210 };
    const result = compareDisciplines(objective, goal, { ftp: 280, css: 100 });
    expect(result.powerFraction).toBe(.75);
    expect(result.swimPace).toBeGreaterThan(0);
    expect(result.bikeSpeed).toBeGreaterThan(0);
    expect(result.remainingMinutes).toBe(10);
    expect(comparePerformance({ objectif: objective, vma: 15, vo2max: 50, paceThresholdSecPerKm: 270, athleteAge: 42 }, goal).cohort).toBeNull();
  });
  it('computes IM swimming and cycling demands with the right units', () => {
    const result = compareDisciplines('IM', { minutes: 600, swimMinutes: 76, bikeMinutes: 300 }, { css: 110 });
    expect(result.swimPace).toBe(120);
    expect(result.swimGap).toBe(10);
    expect(result.bikeSpeed).toBe(36);
    expect(result.powerFraction).toBeNull();
  });
  it.each(['Trail','TrailShort','TrailMountain','TrailUltra'])('does not apply road or bike metrics to %s', objective => {
    const goal = { minutes: 360, distanceKm: 43, elevationM: 3200, bikeWatts: 200 };
    expect(compareDisciplines(objective, goal, { ftp: 250 }).powerFraction).toBeNull();
    expect(compareDisciplines(objective, goal, {}).trailPace).toBeCloseTo(502.33, 2);
  });
  it('rejects impossible split sums and nonfinite course metadata', () => {
    expect(readPerformanceGoal({ minutes: 600, swimMinutes: 80, bikeMinutes: 300, runMinutes: 230 })).toBeNull();
    expect(readPerformanceGoal({ minutes: 60, elevationM: Infinity })).toBeNull();
    expect(readPerformanceGoal({ minutes: 60, elevationM: 0 })?.elevationM).toBe(0);
  });
  it('does not invent a beginner distance or missing sex cohort', () => {
    expect(compareDisciplines('StartToRun', { minutes: 30 }, {}).trailPace).toBeNull();
    expect(olympicCohort(null)).toBeNull();
    expect(olympicCohort('F')?.n).toBe(20);
  });
});
