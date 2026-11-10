import { describe, it, expect } from 'vitest';
import { criticalForSessions, parseStoredCriticalMetrics, toStoredCritical, type StoredCriticalSport } from '../criticalMetrics';
import { detectRunIntervals, endBalanceFraction, proposeForInterval } from '../criticalIntervalProposals';
import type { CriticalFit } from '../criticalEfforts';

const bike: StoredCriticalSport = { critical: 250, reserve: 20000, status: 'confirmed', efforts: [], r2: 0.99, residualPct: 1, sensitivityPct: 3, warnings: [], savedAt: '2026-11-01', latestEffortDate: '2026-11-01' };
const run: StoredCriticalSport = { ...bike, critical: 4, reserve: 200 };
const fit = (status: CriticalFit['status']): CriticalFit => ({ critical: 250, reserve: 20000, r2: 0.99, residualPct: 1, sensitivityPct: 3, errors: [], warnings: [], status });

describe('stored critical metrics', () => {
  it('confirmed only when fit is eligible AND coach approved', () => {
    expect(toStoredCritical(fit('eligible'), [], true, '2026-11-10')?.status).toBe('confirmed');
    expect(toStoredCritical(fit('eligible'), [], false, '2026-11-10')?.status).toBe('estimate');
    expect(toStoredCritical(fit('estimate'), [], true, '2026-11-10')?.status).toBe('estimate');
    expect(toStoredCritical(fit('insufficient'), [], true, '2026-11-10')).toBeNull();
  });
  it('estimates never feed sessions', () => {
    expect(criticalForSessions({ cycling: { ...bike, status: 'estimate' } }, 'cycling', '2026-11-10').value).toBeNull();
  });
  it('confirmed tests older than 42 days do not feed sessions', () => {
    expect(criticalForSessions({ cycling: bike }, 'cycling', '2026-12-14').value).toBeNull();
    expect(criticalForSessions({ cycling: bike }, 'cycling', '2026-12-13').value).not.toBeNull();
  });
  it('missing sport = Données insuffisantes', () => {
    expect(criticalForSessions(parseStoredCriticalMetrics(null), 'running', '2026-11-10').reason).toBe('Données insuffisantes');
  });
});

describe('interval proposals', () => {
  it('one 5-min rep at 310 W uses 90% of a 20 kJ W′ → no change, 320 W → shorten', () => {
    expect(proposeForInterval({ reps: 1, durationSec: 300, target: 310, restSec: 60, text: '' }, bike, 'cycling')?.kind).toBe('consistent');
    const p = proposeForInterval({ reps: 2, durationSec: 300, target: 320, restSec: 300, text: '' }, bike, 'cycling');
    expect(p?.kind).toBe('duration');
    expect(p?.proposed.durationSec).toBe(255);
  });
  it('lengthens recovery when reserve would drop below 10%, never shortens it', () => {
    const i = { reps: 3, durationSec: 180, target: 300, restSec: 120, text: '' };
    const p = proposeForInterval(i, bike, 'cycling')!;
    expect(p.kind).toBe('rest');
    expect(p.proposed.restSec!).toBeGreaterThan(120);
    expect(endBalanceFraction({ ...i, restSec: p.proposed.restSec! }, bike, 'cycling')).toBeGreaterThanOrEqual(0.1);
  });
  it('ignores reps below the critical value or shorter than 2 min', () => {
    expect(proposeForInterval({ reps: 5, durationSec: 300, target: 240, restSec: 60, text: '' }, bike, 'cycling')).toBeNull();
    expect(proposeForInterval({ reps: 10, durationSec: 60, target: 400, restSec: 60, text: '' }, bike, 'cycling')).toBeNull();
  });
  it('running proposals are flagged indicative', () => {
    expect(proposeForInterval({ reps: 6, durationSec: 180, target: 4.5, restSec: 60, text: '' }, run, 'running')?.indicative).toBe(true);
  });
  it('parses running intervals with pace and recovery', () => {
    const [i] = detectRunIntervals('6 x 1000m @ 3:45/km récup 2 min');
    expect(i.reps).toBe(6); expect(i.durationSec).toBe(225); expect(i.restSec).toBe(120);
    expect(i.target).toBeCloseTo(1000 / 225, 5);
  });
});
