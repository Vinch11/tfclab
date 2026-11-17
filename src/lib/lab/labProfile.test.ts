import { describe, expect, it } from 'vitest';
import { labCurveSource, labMetabolicCurves } from './labProfile';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';

const input = { vo2max: 52, poids: 52, vlamaxEffectif: { value: 0.4 }, vlamaxRunReference: { value: 0.6 } } as CoachingCompassInput;
describe('100%lab sport boundaries', () => {
  it('keeps test-derived bike information without any Nolio fit', () => {
    const result = labCurveSource(input, 'bike', null, true);
    expect(result?.source).toBe('bilan');
    expect(result?.input.vo2max).toBe(52);
    expect(labMetabolicCurves(result?.input ?? input, 'bike').points).toHaveLength(81);
  });
  it('keeps running tests independently of cycling records', () => {
    const result = labCurveSource(input, 'run', { vo2max: 58.7, vlamax: 0.17 }, true);
    expect(result?.source).toBe('bilan');
    expect(result?.input.vlamaxRunReference?.value).toBe(0.6);
    expect(result?.input.vo2max).toBe(52);
  });
  it('does not substitute a generic profile when a test input is absent', () => {
    expect(labCurveSource({ ...input, poids: null }, 'bike', null, true)).toBeNull();
  });
  it('does not use a bilan outside the chosen period', () => {
    expect(labCurveSource(input, 'bike', null, false)).toBeNull();
  });
  it('never borrows cycling VLamax for a missing running value', () => {
    expect(labMetabolicCurves({ ...input, vlamaxRunReference: null }, 'run').points).toEqual([]);
  });
  it('does not simulate running lactate from the cycling model', () => {
    const run = labMetabolicCurves(input, 'run');
    expect(run.points).toHaveLength(81);
    expect(run.points.every(p => p.lactate === null)).toBe(true);
    expect(labMetabolicCurves(input, 'bike').points[0].lactate).toBeGreaterThan(0);
  });
  it('does not invent curves without a body weight', () => {
    expect(labMetabolicCurves({ ...input, poids: null }, 'bike').points).toEqual([]);
  });
});