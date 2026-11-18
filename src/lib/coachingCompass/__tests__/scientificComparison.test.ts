import { describe, expect, it } from 'vitest';
import { comparisonAxes, thresholdObservation } from '../scientificComparison';
import type { CoachingCompassInput, RadarAxis } from '../types';
const input = { objectif: 'IM', ambition: 'competitor', athleteAge: 51 } as CoachingCompassInput;
const axis = (key: string, value: number): RadarAxis => ({ key, value, target: 1, score: 100, label: key, shortLabel: key, unit: '', icon: '', color: '' });
describe('Compass hypotheses never certify readiness', () => {
  it('does not lower the IM competitor FTP reference from 4 to 3.64 at age 51', () => {
    expect(comparisonAxes(input, [axis('ftpkg', 3.62)])[0]).toMatchObject({ target: 4, score: 90.5 });
  });
  it('does not lower VO2 reference from 58 to 49.3 at age 51', () => {
    expect(comparisonAxes(input, [axis('vo2max', 52)])[0].target).toBe(58);
  });
  it('keeps age out of the 55 min IM competitor TTE hypothesis', () => {
    expect(comparisonAxes(input, [axis('tte', 35)])[0].target).toBe(55);
  });
  it('cannot grade lipid intensity or glycolysis as Ironman readiness', () => {
    expect(comparisonAxes(input, [axis('vlamax', .2), axis('fatmax', 71)]).map(a => a.target)).toEqual([null, null]);
  });
  it('does not invent a triathlon VMA target', () => {
    expect(comparisonAxes(input, [axis('vma', 13)])[0].target).toBeNull();
  });
  it('does not mutate the diagnostic axes', () => {
    const axes = [axis('ftpkg', 3.62)]; const before = structuredClone(axes);
    comparisonAxes(input, axes); expect(axes).toEqual(before);
  });
  it('retains threshold speed without inventing a VMA or race pace', () => {
    expect(thresholdObservation({ vma: null, paceThresholdSecPerKm: 300 })).toEqual({ speed: 12, fractionVma: null });
    expect(thresholdObservation({ vma: 13, paceThresholdSecPerKm: 0 })).toBeNull();
  });
});