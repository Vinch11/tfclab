import { describe, expect, it } from 'vitest';
import type { DbTest } from '@/hooks/useCloudData';
import { storedTestCurves, compatibleTestCurves } from '../testCurves';
const test = (raw: Record<string, unknown>, overrides = {}) => ({ id: 't1', athlete_id: 'a', name: 'Test', sport: 'run', date: '2026-05-05T15:00:00Z', raw, ...overrides }) as unknown as DbTest;
describe('Stored real test observations', () => {
  it('retains actual sprint attempts without generating a time curve', () => {
    const curve = storedTestCurves([test({ sprint_attempts: [83.3, 115], bestDistance: 115, estimatedVlamax: .67 })], 'a')[0];
    expect(curve.points.map(p => p.distance)).toEqual([83.3, 115]);
    expect(curve.axis).toBe('attempt');
    expect(curve.measures.some(m => m.value === .67)).toBe(false);
  });
  it('a summary TTE of 35 minutes at 277 s/km does not invent samples', () => {
    const curve = storedTestCurves([test({ tteObserved: 35, paceThreshold: 277 })], 'a')[0];
    expect(curve.points).toEqual([]);
    expect(curve.thresholds[0].value).toBeCloseTo(3600 / 277, 5);
    expect(curve.measures.find(m => m.unit === 'min')?.value).toBe(35);
  });
  it('normalizes vélo and scopes observations to the athlete', () => {
    const curves = storedTestCurves([test({ puissanceMax: 276 }, { sport: 'vélo' }), test({ puissanceMax: 999 }, { athlete_id: 'b' })], 'a');
    expect(curves).toHaveLength(1);
    expect(curves[0].sport).toBe('bike');
    expect(curves[0].measures[0].value).toBe(276);
  });
  it('uses explicit speed units and leaves missing samples missing', () => {
    const curve = storedTestCurves([test({ streams: { time: [0, 1, 2], speed: [3, null, 4], speed_unit: 'm/s', watts: [100, 200, 300] } })], 'a')[0];
    expect(curve.points.map(p => p.speed)).toEqual([10.8, null, 14.4]);
    expect(curve.points.every(p => p.watts === null)).toBe(true);
    expect(storedTestCurves([test({ streams: { time: [0], speed: [3] } })], 'a')[0].channels).toEqual([]);
  });
  it('comparison requires same sport, protocol, axis and stored channel', () => {
    const a = storedTestCurves([test({ protocolId: 'sprint', sprint_attempts: [115] })], 'a')[0];
    const b = storedTestCurves([test({ protocolId: 'sprint', sprint_attempts: [83.3] })], 'a')[0];
    expect(compatibleTestCurves(a, b, 'distance')).toBe(true);
    expect(compatibleTestCurves(a, { ...b, protocol: null }, 'distance')).toBe(false);
    expect(compatibleTestCurves(a, { ...b, sport: 'bike' }, 'distance')).toBe(false);
    expect(compatibleTestCurves(a, b, 'watts')).toBe(false);
  });
  it('test date and thresholds come only from the test itself', () => {
    const curve = storedTestCurves([test({ testDate: '2026-04-21', ftp_target: 188 }, { sport: 'bike' })], 'a')[0];
    expect(curve.date).toBe('2026-04-21');
    expect(curve.thresholds[0].value).toBe(188);
    expect(curve.thresholds).toHaveLength(1);
  });
});