import { describe, expect, it } from 'vitest';
import { COMPASS_OBJECTIVES, getObjectiveContext, readObjectiveFactor } from '../objectiveReading';
import type { RadarAxis } from '../types';
const axis: RadarAxis = { key: 'vma', label: 'VMA', shortLabel: 'VMA', value: 10, target: 18, score: 40, icon: '', color: '', unit: 'km/h' };
describe('goal reading stays evidence based', () => {
  const objectives = ['5K', '10K', 'Semi', 'Marathon', 'Sprint', 'Olympic', '703', 'IM', 'Trail', 'TrailShort', 'TrailMountain', 'TrailUltra'];
  it('covers the 12 retained objectives and excludes Start to Run', () => {
    expect(Object.keys(COMPASS_OBJECTIVES).sort()).toEqual([...objectives].sort());
    expect(getObjectiveContext('StartToRun')).toBeNull();
  });
  for (const objective of objectives) it(`${objective}: an internal target or VMA scenario cannot create a priority`, () => {
    expect(readObjectiveFactor(axis, objective, 'competitor').status).toBe('confirm');
  });
  it('missing measurement is not a deficit', () => expect(readObjectiveFactor({ ...axis, value: null }, 'IM', 'elite').status).toBe('unavailable'));
  it('missing reference is not a deficit', () => expect(readObjectiveFactor({ ...axis, key: 'ftpkg', target: null }, 'IM', 'elite').status).toBe('unavailable'));
  it('exceeding an extrapolated scenario does not certify suitability', () => expect(readObjectiveFactor({ ...axis, value: 25 }, 'Marathon', 'competitor').status).toBe('confirm'));
  it('two supported independent observations can establish a priority', () => {
    expect(readObjectiveFactor(axis, '10K', 'competitor', [
      { key: 'test', label: '', detail: 'Test.', status: 'deficit', observationGroup: 'test', referenceQuality: 'supported' },
      { key: 'race', label: '', detail: 'Course.', status: 'deficit', observationGroup: 'race', referenceQuality: 'supported' },
    ]).status).toBe('priority');
  });
  it('two calculations from the same observation cannot establish a priority', () => {
    expect(readObjectiveFactor(axis, '10K', 'competitor', [
      { key: 'a', label: '', detail: '', status: 'deficit', observationGroup: 'test', referenceQuality: 'supported' },
      { key: 'b', label: '', detail: '', status: 'deficit', observationGroup: 'test', referenceQuality: 'supported' },
    ]).status).toBe('confirm');
  });
  it('contradictory observations prevent a firm priority', () => {
    expect(readObjectiveFactor(axis, '10K', 'competitor', ['a', 'b', 'c'].map((key, i) => ({ key, label: '', detail: '', status: i === 2 ? 'ok' : 'deficit', referenceQuality: 'supported' }))).status).toBe('confirm');
  });
});