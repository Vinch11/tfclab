import { describe, expect, it } from 'vitest';
import { friendReference, friendPercentileBracket } from '../friendReference';
describe('FRIEND population references, not race readiness', () => {
  it('reproduces female 50–59 treadmill 2022 P5/P25/P50/P75/P90/P95', () => {
    expect(friendReference(51, 'F', 'run')?.values).toEqual([14.5, 19.5, 23.1, 27.3, 31.8, 35.3]);
  });
  it('keeps cycle measurements separate', () => {
    expect(friendReference(51, 'F', 'bike')?.values).toEqual([12.5, 15.2, 17.3, 20, 22.6, 25]);
  });
  it.each([19, 90, NaN, null])('does not invent unsupported age references %s', age => {
    expect(friendReference(age, 'F', 'run')).toBeNull();
  });
  it('does not default a missing sex', () => { expect(friendReference(51, null, 'run')).toBeNull(); });
  it('does not assign Emanuela a percentile from undocumented VO2max 52', () => {
    expect(friendPercentileBracket(52, 51, 'F', 'run', false)).toBeNull();
  });
  it('does not extrapolate an exact extreme percentile even for a measured value', () => {
    expect(friendPercentileBracket(52, 51, 'F', 'run', true)).toEqual({ low: 95, high: null });
  });
});