import { describe, expect, it } from 'vitest';
import { buildSportTestingNolioSessions } from '../testingWeekNolioSessions';
import { buildCriticalSpeedNolioSessions } from '../criticalSpeedAssessment';
import { fitCriticalEfforts } from '@/lib/criticalEfforts';

describe('assessment coverage', () => {
  it.each(['bike', 'run'] as const)('covers all nine existing %s Days', sport => {
    const sessions = buildSportTestingNolioSessions(sport);
    expect(sessions).toHaveLength(9);
    expect(sessions.map(s => s.title.split(' · ')[0])).toEqual(['D-1', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']);
    expect(sessions.filter(s => !s.structuredWorkout.length).every(s => s.title.includes('OFF'))).toBe(true);
  });
  it('prepares three distinct critical-speed maximal efforts without invented targets', () => {
    const sessions = buildCriticalSpeedNolioSessions();
    expect(sessions.map(s => s.structuredWorkout.filter(x => x.type === 'step' && x.intensity_type === 'active').map(x => x.type === 'step' ? x.step_duration_value : 0))).toEqual([[180], [420], [720]]);
    expect(sessions.map(s => s.dayIndex)).toEqual([0, 2, 4]);
    expect(sessions.flatMap(s => s.structuredWorkout).every(x => x.type === 'step' && x.target_type === 'no_target')).toBe(true);
  });
  it('the proposed durations satisfy the existing critical engine for a concrete distance/time model', () => {
    const fit = fitCriticalEfforts([180, 420, 720].map((t, i) => ({ id: String(i), sport: 'running', durationSec: t, value: 4 * t + 150, date: '2026-11-17', session: `Session ${i}`, conditions: 'Piste', source: 'manual', confirmed: true })), 'running', '2026-11-17');
    expect(fit.status).toBe('eligible');
    expect(fit.critical).toBe(4);
    expect(fit.reserve).toBe(150);
  });
});