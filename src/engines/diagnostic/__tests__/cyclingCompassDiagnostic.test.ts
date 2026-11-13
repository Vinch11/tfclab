import { describe, expect, it } from 'vitest';
import { computeCyclingCompassDiagnostic } from '../cyclingCompassDiagnostic';
import type { RadarAxis } from '@/lib/coachingCompass/types';

const axis = (key: string, value: number | null, target: number | null, source = 'observed'): RadarAxis => ({ key, value, target, source, label: key, shortLabel: key, score: 0, unit: 'min', icon: '', color: '' });
const compute = (axes: RadarAxis[], vo2Shared = true) => computeCyclingCompassDiagnostic({ axes, ftp: 188, vo2Shared });
describe('Independent cycling compass diagnosis', () => {
  it('ranks declared bike TTE 35 against its existing 52 minute target', () => {
    const result = compute([axis('tte', 35, 52)]);
    expect(result.priorities[0]?.key).toBe('tte');
    expect(result.priorities[0]?.gapPercent).toBeCloseTo(100 * 17 / 52);
  });
  it('keeps modeled TTE visible but outside priorities', () => {
    const result = compute([axis('tte', 35, 52, 'estimated')]);
    expect(result.axes[0].value).toBe(35);
    expect(result.priorities).toEqual([]);
  });
  it('does not score shared VO2 as a bike priority', () => {
    expect(compute([axis('vo2max', 40, 60)]).priorities).toEqual([]);
    expect(compute([axis('vo2max', 40, 60)], false).priorities[0]?.key).toBe('vo2max');
  });
  it('excludes lipid models and reserves even when their gaps are large', () => {
    expect(compute([axis('fatmax', 10, 80), axis('wprime', 1, 20)]).priorities).toEqual([]);
  });
  it('does not invent missing values or targets', () => {
    expect(compute([axis('tte', null, 52), axis('ftpkg', 3.62, null)]).priorities).toEqual([]);
  });
  it('ranks bike gaps descending without mutating the supplied axes', () => {
    const axes = [axis('ftpkg', 3, 4), axis('tte', 20, 50), axis('vlamax', .6, .4, 'snapshot')];
    const before = structuredClone(axes);
    expect(compute(axes).priorities.map(p => p.key)).toEqual(['tte', 'vlamax', 'ftpkg']);
    expect(axes).toEqual(before);
    expect(compute(axes).priorities[1]?.provisional).toBe(true);
  });
});