import { describe, expect, it } from 'vitest';
import { curveStatus, oxygenDemandCurve, profileCurveHistory } from '../profileCurves';
import type { DbSnapshot } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from '../types';
const snapshot = (overrides: Record<string, unknown> = {}) => ({ id: 's1', athlete_id: 'a', coach_id: 'c', date: '2026-11-12', source: 'manual', vo2max: 50, vlamax: .2, vlamax_run: .6, ftp: 188, pace_threshold_sec_per_km: 315, ...overrides }) as DbSnapshot;
describe('Sport-specific profile curves and evidence', () => {
  it('a manual value and a Nolio import cannot certify a measurement', () => {
    expect(curveStatus(snapshot(), 'vo2max')).toBe('recorded');
    expect(curveStatus(snapshot({ field_sources: { vo2max: { source: 'nolio', protocol: 'record', sensor: 'Garmin' } } }), 'vo2max')).toBe('recorded');
  });
  it('requires explicit measurement provenance, protocol and sensor', () => {
    expect(curveStatus(snapshot({ field_sources: { vo2max: { source: 'lab', protocol: 'ramp', sensor: 'gas analyzer' } } }), 'vo2max')).toBe('measured');
    expect(curveStatus(snapshot({ field_sources: { vo2max: { source: 'lab', protocol: 'ramp' } } }), 'vo2max')).toBe('recorded');
  });
  it('a modeled result stays estimated even with sensor documentation', () => {
    expect(curveStatus(snapshot({ field_sources: { vo2max: { source: 'estimated', protocol: 'ramp', sensor: 'Garmin' } } }), 'vo2max')).toBe('estimated');
  });
  it('keeps course .6 separate from bike .2 and excludes other athletes and later dates', () => {
    const rows = [snapshot(), snapshot({ id: 'other', athlete_id: 'b', vlamax_run: .9 }), snapshot({ id: 'later', date: '2026-11-13', vlamax_run: .8 })];
    expect(profileCurveHistory(rows, 'a', 'run', 'vlamax', '2026-11-12').map(p => p.value)).toEqual([.6]);
    expect(profileCurveHistory(rows, 'a', 'bike', 'vlamax', '2026-11-12').map(p => p.value)).toEqual([.2]);
  });
  it('never fills missing running VLamax from bike and converts 315 s/km to velocity', () => {
    expect(profileCurveHistory([snapshot({ vlamax_run: null })], 'a', 'run', 'vlamax', null)[0].value).toBeNull();
    expect(profileCurveHistory([snapshot()], 'a', 'run', 'threshold', null)[0].value).toBeCloseTo(11.42857, 4);
  });
  it('cannot create oxygen demand from invalid or absent sport inputs', () => {
    const input = { vo2max: 50, poids: 52, ftp: 188, vma: null, runEconomyScore: 65 } as CoachingCompassInput;
    expect(oxygenDemandCurve(input, 'run')).toEqual([]);
    expect(oxygenDemandCurve({ ...input, poids: Infinity }, 'bike')).toEqual([]);
  });
  it('running demand uses 197.5 ml/kg/km for score 65 without changing inputs', () => {
    const input = { vo2max: 50, poids: 52, ftp: 188, vma: 14.2, runEconomyScore: 65 } as CoachingCompassInput;
    const before = structuredClone(input);
    const points = oxygenDemandCurve(input, 'run');
    expect(points.at(-1)?.oxygen).toBeCloseTo(197.5 * 14.2 / 60, 2);
    expect(input).toEqual(before);
    expect(profileCurveHistory([snapshot()], 'a', 'bike', 'economy', null)).toEqual([]);
  });
});