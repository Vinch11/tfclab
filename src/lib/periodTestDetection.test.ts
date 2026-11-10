import { describe, expect, it } from 'vitest';
import { bestMeanPower, detectPeriodTests, detectedToFields, type DetectionSession } from './periodTestDetection';

const flat = (n: number, w: number) => ({ time: Array.from({ length: n }, (_, i) => i), watts: Array.from({ length: n }, () => w) });

describe('Trouver les tests de la période', () => {
  it('keeps the best measured result across sessions (coach rule)', () => {
    const a: DetectionSession = { id: 'a', name: 'A', date: '2026-10-16', sportBase: 'cycling', ...flat(400, 219) };
    const b: DetectionSession = { id: 'b', name: 'B', date: '2026-10-19', sportBase: 'cycling', ...flat(400, 202) };
    const map = detectPeriodTests([b, a]).find(t => t.field === 'map5min_w')!;
    expect(map.value).toBe(219);
    expect(map.sessionId).toBe('a');
    expect(map.alternatives[0].display).toBe('202 W');
  });

  it('detects a 15 s run sprint from a lap and keeps the longest distance', () => {
    const s: DetectionSession = { id: 'r', name: 'Sprints', date: '2026-10-19', sportBase: 'running',
      laps: [{ distance: 65.5, duration: 15 }, { distance: 63.2, duration: 15 }, { distance: 2308, duration: 900 }] };
    const sprint = detectPeriodTests([s]).find(t => t.field === 'sprint_15s')!;
    expect(sprint.value).toBe(65.5);
  });

  it('detects VMA only from a 5–7 min lap', () => {
    const s: DetectionSession = { id: 'v', name: 'VMA', date: '2026-10-06', sportBase: 'running',
      laps: [{ distance: 1420, duration: 360 }, { distance: 2308, duration: 900 }] };
    const tests = detectPeriodTests([s]);
    expect(tests.find(t => t.field === 'vma')!.value).toBe(14.2);
  });

  it('detects a VMA test split into consecutive 400 m auto-laps', () => {
    const s: DetectionSession = { id: 'v4', name: 'VMA', date: '2026-10-06', sportBase: 'running',
      laps: [{ distance: 400, duration: 120 }, ...Array.from({ length: 4 }, () => ({ distance: 400, duration: 100 })), { distance: 400, duration: 120 }] };
    expect(detectPeriodTests([s]).find(t => t.field === 'vma')!.value).toBe(14.4);
  });

  it('never proposes FTP or threshold duration', () => {
    const s: DetectionSession = { id: 'x', name: 'X', date: '2026-10-21', sportBase: 'cycling', ...flat(3600, 200) };
    const fields = detectPeriodTests([s]).map(t => t.field as string);
    expect(fields).not.toContain('ftp');
    expect(fields).not.toContain('tte_observed_min');
  });

  it('shows a 20 min bike test lap as information only, never as FTP', () => {
    const s: DetectionSession = { id: 'f', name: 'FTP', date: '2026-10-21', sportBase: 'cycling', bikeLaps: [{ duration: 1200, watts: 198 }, { duration: 300, watts: 212 }] };
    const t = detectPeriodTests([s]).find(x => x.field === 'test20min_w')!;
    expect(t.value).toBe(198);
    expect(t.fillable).toBe(false);
    expect(detectedToFields([t])).toEqual({});
  });

  it('computes HR drift on a long steady run, warm-up excluded, and fills the snapshot', () => {
    const laps = Array.from({ length: 12 }, (_, i) => ({ distance: 1000, duration: 300, stats: { heartrate_avg: { value: i < 7 ? 140 : 150 } } }));
    const t = detectPeriodTests([{ id: 'l', name: 'Long', date: '2026-10-10', sportBase: 'running', laps }]).find(x => x.field === 'run_hr_drift_pct')!;
    expect(t.value).toBeGreaterThan(3);
    expect(t.fillable).toBe(true);
  });

  it('ignores interval sessions for drift', () => {
    const laps = Array.from({ length: 14 }, (_, i) => ({ distance: i % 2 ? 1000 : 400, duration: 300, stats: { heartrate_avg: { value: 150 } } }));
    expect(detectPeriodTests([{ id: 'i', name: 'Fractionné', date: '2026-10-10', sportBase: 'running', laps }]).find(x => x.field === 'run_hr_drift_pct')).toBeUndefined();
  });

  it('shows running power cost as information only', () => {
    const laps = Array.from({ length: 10 }, () => ({ distance: 1000, duration: 300, stats: { heartrate_avg: { value: 145 }, watts_avg: { value: 216 } } }));
    const t = detectPeriodTests([{ id: 'p', name: 'EF', date: '2026-10-10', sportBase: 'running', laps }]).find(x => x.field === 'run_power_cost')!;
    expect(t.value).toBe(18);
    expect(t.fillable).toBe(false);
  });

  it('does not interpolate across recording gaps', () => {
    expect(bestMeanPower([0, 1, 100, 101], [300, 300, 300, 300], 30)).toBeLessThan(30);
  });
});
