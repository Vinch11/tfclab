import { describe, expect, it } from 'vitest';
import { bestMeanPower, detectPeriodTests, type DetectionSession } from './periodTestDetection';

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

  it('never proposes FTP or threshold duration', () => {
    const s: DetectionSession = { id: 'x', name: 'X', date: '2026-10-21', sportBase: 'cycling', ...flat(3600, 200) };
    const fields = detectPeriodTests([s]).map(t => t.field as string);
    expect(fields).not.toContain('ftp');
    expect(fields).not.toContain('tte_observed_min');
  });

  it('does not interpolate across recording gaps', () => {
    expect(bestMeanPower([0, 1, 100, 101], [300, 300, 300, 300], 30)).toBeLessThan(30);
  });
});
