import { describe, it, expect } from 'vitest';
import { computeFactorVerdict, buildVmaEvidence } from '../factorVerdict';
import { getVmaReference } from '../vmaReference';

const ref = getVmaReference('Marathon', 'competitor');

describe('factorVerdict', () => {
  it('two agreeing deficits → probable limiter', () => {
    expect(computeFactorVerdict([
      { key: 'a', label: '', status: 'deficit', detail: '' },
      { key: 'b', label: '', status: 'deficit', detail: '' },
    ]).kind).toBe('probable_limiter');
  });
  it('a single deficit is only a gap to confirm', () => {
    expect(computeFactorVerdict([
      { key: 'a', label: '', status: 'deficit', detail: '' },
      { key: 'b', label: '', status: 'unknown', detail: '' },
    ]).kind).toBe('gap_to_confirm');
  });
  it('nothing known → to measure', () => {
    expect(computeFactorVerdict([{ key: 'a', label: '', status: 'unknown', detail: '' }]).kind).toBe('to_measure');
  });
  it('VMA below scenario with low threshold fraction stays to confirm', () => {
    // 13 km/h, seuil 5:45/km = 10.43 km/h → 80 %
    const v = computeFactorVerdict(buildVmaEvidence({ vma: 10, paceThresholdSecPerKm: 450, reference: ref }));
    expect(v.kind).toBe('gap_to_confirm');
  });
  it('VMA below scenario and its derived threshold ratio remain unconfirmed', () => {
    // 10 km/h, seuil 6:00/km = 10 → 100 %? use 6:40 = 9 km/h → 90 %
    const v = computeFactorVerdict(buildVmaEvidence({ vma: 10, paceThresholdSecPerKm: 400, reference: ref }));
    expect(v.kind).toBe('gap_to_confirm');
  });
  it('missing VMA and threshold → to measure', () => {
    expect(computeFactorVerdict(buildVmaEvidence({ vma: null, paceThresholdSecPerKm: null, reference: ref })).kind).toBe('to_measure');
  });
  it('triathlon adds a run-off-bike observation, never inferred', () => {
    const e = buildVmaEvidence({ vma: 15, paceThresholdSecPerKm: 260, reference: getVmaReference('IM', 'age_group'), isTriathlon: true });
    expect(e.find(x => x.key === 'run_off_bike')?.status).toBe('unknown');
  });
});
