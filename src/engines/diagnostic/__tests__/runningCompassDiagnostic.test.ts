import { describe, expect, it } from 'vitest';
import { computeRunningCompassDiagnostic, type RunningCompassDiagnosticInput } from '../runningCompassDiagnostic';
import { axisAssessment } from '@/lib/coachingCompass/presentation';

const base: RunningCompassDiagnosticInput = { objectif: 'IM', ambition: 'competitor', age: 51, vma: 14.2, vo2max: 50, vo2Source: 'shared', paceThresholdSecPerKm: 315, vlamax: null, tte: { tte_min: 40, source: 'observed' }, economy: 65, drift: 1.3 };
describe('Independent running compass diagnosis', () => {
  it('preserves 14.2 km/h with no IM VMA target and no deficit conclusion', () => {
    const result = computeRunningCompassDiagnostic(base);
    const axis = result.axes.find(a => a.key === 'vma');
    expect(axis?.value).toBe(14.2);
    expect(axis?.target).toBeNull();
    expect(axis && axisAssessment(axis)).toBe('Comparaison non définie');
    expect(result.priorities.some(p => p.key === 'vma')).toBe(false);
  });
  it('uses the existing IM competitor age-adjusted TTE target, not durability score', () => {
    const result = computeRunningCompassDiagnostic(base);
    expect(result.axes.find(a => a.key === 'tte')?.value).toBe(40);
    expect(result.axes.find(a => a.key === 'tte')?.target).toBe(52);
    expect(result.priorities[0]?.key).toBe('tte');
  });
  it('does not certify load-derived running TTE', () => {
    const result = computeRunningCompassDiagnostic({ ...base, tte: { tte_min: 70, source: 'estimated' } });
    expect(result.axes.find(a => a.key === 'tte')?.value).toBeNull();
    expect(result.priorities.some(p => p.key === 'tte')).toBe(false);
  });
  it('keeps records provisional and does not replace missing running VLamax', () => {
    const result = computeRunningCompassDiagnostic({ ...base, tte: { tte_min: 19, source: 'records' } });
    expect(result.priorities.find(p => p.key === 'tte')?.provisional).toBe(true);
    expect(result.axes.find(a => a.key === 'vlamax')?.value).toBeNull();
  });
  it('never ranks common VO2 or economy as independent running limiters', () => {
    const result = computeRunningCompassDiagnostic({ ...base, vo2max: 10, economy: 1 });
    expect(result.priorities.map(p => p.key)).toEqual(['tte']);
  });
  it.each(['5K', '10K', 'Semi', 'Marathon', 'Trail', '703', 'IM'])('keeps missing data unknown for %s', objectif => {
    const result = computeRunningCompassDiagnostic({ ...base, objectif, vma: null, vo2max: null, tte: null });
    expect(result.axes.every(a => a.value == null)).toBe(true);
    expect(result.priorities).toEqual([]);
  });
  it('ranks run-specific VMA and VLamax deficits for Vince without bike inputs', () => {
    const result = computeRunningCompassDiagnostic({ ...base, objectif: '10K', age: 42, vma: 16.7, tte: { tte_min: 75, source: 'observed' }, vlamax: { value: .57, source: 'snapshot' } });
    expect(result.priorities.some(p => p.key === 'vma')).toBe(true);
    expect(result.priorities.some(p => p.key === 'vlamax')).toBe(true);
    expect(result.priorities.some(p => p.key === 'tte')).toBe(false);
  });
});