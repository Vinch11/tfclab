import { describe, expect, it } from 'vitest';
import { metabolicOverview } from '../metabolicOverview';
import type { CoachingCompassInput } from '../types';
const input = { vo2max: 56, poids: 70, ftp: 260, vma: 17, vlamaxEffectif: { value: .3, source: 'estimation', confidence: .6 }, vlamaxRunReference: { value: .57, source: 'snapshot' } } as CoachingCompassInput;
describe('Read-only metabolic overview', () => {
  it('never uses cycling VLamax to fill a missing running observation', () => {
    const result = metabolicOverview({ ...input, vlamaxRunReference: null }, 'run');
    expect(result.points).toEqual([]);
    expect(result.missing).toContain('VLamax course');
  });
  it('running x axis uses its own VMA, not cycling watts', () => {
    const result = metabolicOverview(input, 'run');
    expect(result.points[0].output).toBeCloseTo(3.4);
    expect(result.points.at(-1)?.output).toBe(17);
    expect(metabolicOverview({ ...input, ftp: 900 }, 'run')).toEqual(result);
  });
  it('rejects missing or non-finite required inputs rather than drawing a fake curve', () => {
    expect(metabolicOverview({ ...input, poids: Infinity }, 'bike').points).toEqual([]);
    expect(metabolicOverview({ ...input, vo2max: null }, 'run').peak).toBeNull();
  });
  it('keeps carbohydrate oxidation separate from fat energy and leaves inputs unchanged', () => {
    const before = structuredClone(input);
    const result = metabolicOverview(input, 'bike');
    expect(result.points[40].carbEnergy).toBeCloseTo(result.points[40].carbs * 4);
    expect(result.points[40].fatEnergy).toBeCloseTo(result.points[40].fat * 9);
    expect(input).toEqual(before);
  });
});