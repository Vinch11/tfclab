import { describe, expect, it } from 'vitest';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { coherenceChecks, fitBikeOnNolio, fitRunOnNolio, labLactateKinetics, nolioEnvelope, type NolioRecordRow } from './nolioCalibration';

const row = (cat: string, sport_id: number, item_seconds: number, value: number, date = '2026-06-01'): NolioRecordRow => ({ cat, record_type: 'time', sport_id, item_seconds, value, date_recorded: date });
// Emanuela-like home-trainer records (sport 18) + a running-power record (sport 2) that must be ignored for the bike
const bikeRows = [[5, 510], [10, 357], [15, 345], [30, 322], [60, 292], [120, 271], [180, 265], [300, 245], [600, 225], [900, 220], [1200, 210]].map(([t, w]) => row('ppr', 18, t, w));
const rows = [...bikeRows, row('ppr', 2, 30, 900), row('ppr', 18, 60, 120, '2020-01-01')];
const input = { vo2max: 52, poids: 52, vlamaxEffectif: { value: 0.2 } } as CoachingCompassInput;

describe('100%lab Nolio calibration', () => {
  it('builds a bike envelope without running power or out-of-window records', () => {
    const env = nolioEnvelope(rows, 'ppr', [14, 18], '2026-11-12');
    expect(env.find(p => p.durationSec === 30)?.value).toBe(322);
    expect(env.find(p => p.durationSec === 60)?.value).toBe(292);
  });
  it('makes the envelope monotone', () => {
    const env = nolioEnvelope([row('ppr', 18, 600, 200), row('ppr', 18, 900, 230)], 'ppr', [18], '2026-11-12');
    expect(env.map(p => p.value)).toEqual([230, 230]);
  });
  it('fits VO2max within ±15 % of the bilan and reproduces records within 12 %', () => {
    const fit = fitBikeOnNolio(input, nolioEnvelope(rows, 'ppr', [14, 18], '2026-11-12'))!;
    expect(fit.vo2max).toBeGreaterThanOrEqual(52 * 0.85);
    expect(fit.vo2max).toBeLessThanOrEqual(52 * 1.15);
    expect(fit.errorPct).toBeLessThan(12);
  });
  it('refuses to fit without short and long efforts', () => {
    expect(fitBikeOnNolio(input, [{ durationSec: 300, value: 245, date: null }])).toBeNull();
  });
  it('crosses lactate production and elimination at the MLSS', () => {
    const below = labLactateKinetics(50, 52, 0.4, 52)!, above = labLactateKinetics(98, 52, 0.4, 52)!;
    expect(below.elimination).toBeGreaterThan(below.production);
    expect(above.production).toBeGreaterThan(above.elimination);
  });
  it('fits critical speed from running paces and flags a VMA above the 6-min best', () => {
    const env = nolioEnvelope([[180, 3.69], [300, 3.58], [360, 3.56], [600, 3.54], [1200, 3.53]].map(([t, v]) => row('par', 2, t, v)), 'par', [2, 52], '2026-11-12');
    const run = fitRunOnNolio(env)!;
    expect(run.csKmh).toBeGreaterThan(12);
    expect(run.vma6Kmh).toBe(12.8);
    const checks = coherenceChecks(input, { vma: 14.2 }, null, [], run, []);
    expect(checks.find(c => c.key === 'vma')?.level).toBe('alert');
  });
});
