import { describe, expect, it } from 'vitest';
import { labMetabolicCurves } from './labProfile';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';

const input = { vo2max: 52, poids: 52, vlamaxEffectif: { value: 0.4 }, vlamaxRunReference: { value: 0.6 } } as CoachingCompassInput;
describe('100%lab sport boundaries', () => {
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