import { describe, expect, it } from 'vitest';
import { parseSessionDurationMin, validatePlan } from '../planValidator';
import { jsonPlanToParsedPlan } from '@/lib/plan/jsonPlanToParsedPlan';
import fixture from '@/lib/plan/qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json';
import type { ParsedSession, ParsedPlan } from '@/lib/aiPlanParser';
const session = (extra: Partial<ParsedSession> = {}): ParsedSession => ({ weekNumber: 1, weekTheme: 'Build', phase: 'build',
  dayName: 'Lundi', dayIndex: 0, sport: 'Course', title: 'Endurance', details: '30min Z2', isRest: false, ...extra });
describe('prescribed duration is authoritative, without inventing intensity minutes', () => {
  it('preserves structured minutes instead of summing the prose', () => {
    expect(parseSessionDurationMin(session({ durationMin: 95, details: '15min Z1. 75min Z2. 5min retour au calme' }))).toBe(95);
    expect(parseSessionDurationMin(session({ durationMin: 12, details: 'Activation' }))).toBe(12);
    expect(parseSessionDurationMin(session({ durationMin: 330, sport: 'Vélo', details: 'Sortie longue' }))).toBe(330);
  });
  it('keeps rest at zero and falls back only for unavailable or invalid structured data', () => {
    expect(parseSessionDurationMin(session({ isRest: true, durationMin: 120 }))).toBe(0);
    for (const durationMin of [undefined, 0, -1, NaN, Infinity]) expect(parseSessionDurationMin(session({ durationMin }))).toBe(30);
  });
  it('replays the recorded synthetic-profile plan with its original totals', () => {
    const parsed = jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan));
    const metrics = validatePlan(parsed, '5 KM').weekMetrics;
    for (const [week, expected] of [[1, 170], [8, 165], [12, 87]]) {
      expect(metrics.find(w => w.weekNumber === week)?.totalDurationMin).toBe(expected);
    }
    expect(parsed.weeks[0].sessions).toEqual(jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan)).weeks[0].sessions);
  });
  it('does not turn unparsed minutes into invented easy training', () => {
    const plan = { title: 'Synthetic', totalWeeks: 1, phases: [], weeks: [{ weekNumber: 1, phase: 'build', theme: 'Build',
      sessions: [session({ durationMin: 60, title: 'Séance mixte', details: '20min Z5. Suite non décrite', zones: ['Z1', 'Z5'] })] }] } as ParsedPlan;
    const profile = validatePlan(plan, '10 KM').weekMetrics[0].intensityProfile;
    expect(profile.unknownPct).toBeGreaterThan(60);
    expect(profile.lowPct).toBe(0);
  });
});
