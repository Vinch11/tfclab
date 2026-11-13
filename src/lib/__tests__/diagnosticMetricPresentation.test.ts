import { describe, expect, it } from 'vitest';
import { diagnosticMetricPresentation } from '../diagnosticMetricPresentation';
import type { AthleteDiagnostic } from '@/engines/diagnostic';
import { athleteSchema } from '../validationSchemas';

const fixture = () => ({ effectifs: { tte: { tte_min: 35, source: 'estimated' } }, limiter: { gapAnalysis: ['W′', "W'", "W' (kJ)", 'TTE', 'Durability', 'Durabilité', 'FatMax', 'VO2max'].map(metric => ({ metric, value: 7, target: 20, weightedImpact: 10 })) } }) as unknown as AthleteDiagnostic;
describe('unscored physiological references', () => {
  it.each(['W′', "W'", "W' (kJ)", 'TTE', 'Durability', 'Durabilité', 'FatMax'])('%s is not a scored dashboard deficit', metric => {
    const input = fixture(), before = structuredClone(input), view = diagnosticMetricPresentation(input);
    expect(view.scored.some(g => g.metric === metric)).toBe(false);
    expect(view.references.some(g => g.metric === metric)).toBe(true);
    expect(input).toEqual(before);
  });
  it('keeps the actual 35-minute TTE without calling it durability', () => {
    expect(diagnosticMetricPresentation(fixture()).tte?.tte_min).toBe(35);
    expect(diagnosticMetricPresentation(fixture()).scored.map(g => g.metric)).toEqual(['VO2max']);
  });
  it('missing TTE stays missing', () => {
    const input = fixture(); input.effectifs.tte.tte_min = 0;
    expect(diagnosticMetricPresentation(input).tte).toBeNull();
  });
  it('economy is an efficiency reference without changing the plan ranking', () => {
    const data = fixture();
    data.limiter.gapAnalysis.push({ ...data.limiter.gapAnalysis[0], metric: 'Économie', value: 60 });
    const before = structuredClone(data);
    const view = diagnosticMetricPresentation(data);
    expect(view.scored.some(g => g.metric === 'Économie')).toBe(false);
    expect(view.references.some(g => g.metric === 'Économie')).toBe(true);
    expect(data).toEqual(before);
  });
  it.each(['M', 'F', null])('sex %s can be saved without inventing a value', sex => {
    expect(athleteSchema.parse({ name: 'Test', sex }).sex).toBe(sex);
  });
  it('rejects unsupported sex values', () => {
    expect(athleteSchema.safeParse({ name: 'Test', sex: 'invented' }).success).toBe(false);
  });
});