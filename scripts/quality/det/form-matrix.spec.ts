import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { appendFileSync, readFileSync } from 'node:fs';
import { buildAppPlanConfig, computeAppAthleteContext, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { DetRefusal, detSupportsObjective, generateDetPlanFromPageInput } from '@/lib/plan/detEngineRun';
import { AMBITION_LEVELS_ORDERED } from '@/types/ambitionLevel';
import type { V3PlanProposal } from '@/lib/det/appPlanningV3Proposal';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

interface Scenario {
  objective: string;
  weeks: number;
  hours: number;
  sessions?: number;
  distanceKm?: number;
  elevationM?: number;
}

// One reference configuration per objective. Change one form dimension at a time.
const scenarios: Scenario[] = [
  { objective: 'IM', weeks: 16, hours: 14, sessions: 10 },
  { objective: '703', weeks: 12, hours: 10, sessions: 8 },
  { objective: 'Marathon', weeks: 16, hours: 8 },
  { objective: 'Semi', weeks: 8, hours: 6, sessions: 4 },
  { objective: '10K', weeks: 8, hours: 6, sessions: 4 },
  { objective: 'StartToRun', weeks: 12, hours: 3, sessions: 3 },
  { objective: 'TrailShort', weeks: 12, hours: 7, distanceKm: 30, elevationM: 1000 },
  { objective: 'TrailMountain', weeks: 16, hours: 9, distanceKm: 55, elevationM: 3000 },
  { objective: 'TrailUltra', weeks: 20, hours: 12, distanceKm: 90, elevationM: 4500 },
];
const levels = ['auto', 'untrained', 'light', 'trained', 'highly_trained'];
const subset = process.env.DET_OBJECTIVES?.split(',');
const selected = scenarios.filter(s => !subset || subset.includes(s.objective));
const output = process.env.DET_MATRIX_JSONL;
const blockedFetch = vi.fn(() => { throw Error('Unexpected network access during offline DET audit'); });

beforeAll(() => {
  vi.stubGlobal('fetch', blockedFetch);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-09T08:00:00Z'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  expect(blockedFetch).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('covers the objectives offered by the normal coach form', () => {
  const page = readFileSync('src/pages/AITrainingPlanPage.tsx', 'utf8');
  const options = /const OBJECTIVE_OPTIONS = \[([\s\S]*?)\];/.exec(page);
  expect(options, 'Review the matrix when the form changes').toBeTruthy();
  const values = [...options![1].matchAll(/value:\s*"([^"]+)"/g)].map(m => m[1]);
  expect(scenarios.map(s => s.objective).sort()).toEqual(values.sort());
  if (subset) expect(selected.map(s => s.objective).sort()).toEqual([...subset].sort());
});

function inputFor(s: Scenario, trainingLevel: string, ambition: string, coachOrder: string[] = []) {
  const tri = s.objective === '703' || s.objective === 'IM';
  const id = 'SYNTHETIC_DET_' + s.objective;
  const athlete = { id, name: 'Synthetic', objectif: s.objective, birth_date: '1988-03-11',
    sex: 'M', active_snapshot_id: 'SYNTHETIC_SNAPSHOT', refs: {} };
  const snapshot = { id: athlete.active_snapshot_id, athlete_id: id, date: '2026-11-04', source: 'manual',
    sport_main: tri ? 'tri' : 'run', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240,
    tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188,
    ...(s.objective === '10K' ? { tte_observed_min_run: 25 } : {}) };
  const context = computeAppAthleteContext(athlete, s.objective, ambition, { snapshots: [snapshot], tests: [], checkins: [] });
  if (!context) throw Error('Synthetic snapshot did not produce an app diagnostic');
  const form: AppPlanFormState = {
    objective: s.objective, ambition, trainingLevel, planStartDate: new Date(2026, 10, 9),
    raceName: 'Synthetic ' + s.objective, raceDate: new Date(Date.UTC(2026, 10, 9 + s.weeks*7 - 1)).toISOString().slice(0, 10),
    raceFormat: 'continuous', raceGoals: [], trailDistanceKm: String(s.distanceKm ?? ''), trailElevationM: String(s.elevationM ?? ''),
    trailTargetTimeH: '', trailMaxAltitudeM: '', weeksAvailable: s.weeks, weeklyHours: String(s.hours),
    sessionsPerWeek: String(s.sessions ?? ''), maxSessionsPerDay: '2', strengthSessionsPerWeek: s.objective === 'Marathon' ? '2' : '1',
    deloadCadence: 'auto', constraints: '', terrainAvailability: 'auto', lockAmbition: false,
    crossTrainingVelo: false, crossTrainingNatation: false, chronicWeeklyHours: '', recentWeeklyHours: '', recentWeeksCount: '',
    maxDoubleDaysPerWeek: '', coachLimiterOrder: coachOrder, currentAthleteId: id,
  };
  const config = buildAppPlanConfig(context.diagnostic, form);
  return { athleteId: id, config, athlete: context.data, diagnostic: context.diagnostic, pageLimiterOrder: coachOrder };
}

function emit(row: object) {
  const json = JSON.stringify(row);
  if (output) appendFileSync(output, json + '\n');
  else process.stdout.write('DET_MATRIX ' + json + '\n');
}

for (const scenario of selected) {
  describe(scenario.objective, () => {
    for (const level of levels) {
      it.each(AMBITION_LEVELS_ORDERED)(level + ' / %s', async ambition => {
        const row = { objective: scenario.objective, level, ambition, weeks: scenario.weeks, hours: scenario.hours };
        if (!detSupportsObjective(scenario.objective)) {
          emit({ ...row, status: 'outside_det' });
          return;
        }
        const input = inputFor(scenario, level, ambition);
        const meta = input.config.ambitionMeta;
        const diagnostic = { effectiveLevel: meta?.trainingLevel, levelSource: meta?.trainingLevelSource, effectiveAmbition: meta?.effective,
          limiters: input.config.identifiedLimitersRaw ?? [] };
        let plan;
        try {
          plan = await generateDetPlanFromPageInput(input);
        } catch (error) {
          if (!(error instanceof DetRefusal)) throw error;
          emit({ ...row, ...diagnostic, status: 'refused', reasons: error.reasons });
          return;
        }
        const p = (plan as typeof plan & { _detSourceProposal: V3PlanProposal })._detSourceProposal;
        expect(p.limiterOrder).toEqual(diagnostic.limiters);
        expect(p.weeks).toHaveLength(scenario.weeks);
        expect(p.checks.filter(c => c.status === 'blocked')).toEqual([]);
        const sessions = p.weeks.flatMap(w => w.days.flatMap(d => d.sessions));
        const components = sessions.flatMap(s => s.components);
        const primary = p.checks.filter(c => c.code === 'primary_dose_coverage' && c.status === 'passed');
        emit({ ...row, ...diagnostic, status: 'assembled', activities: sessions.length,
          uniqueSources: new Set(components.map(c => c.sourceId)).size, loadWeeks: p.weeks.filter(w => w.weekType === 'load').length,
          weeksWithPrimaryDoseCheck: new Set(primary.map(c => c.week)).size,
          weeksWithTriComponentDose: p.checks.filter(c => c.code === 'tri_primary_component_dose' && c.status === 'passed').length,
          weeksWithTriComponentPending: p.checks.filter(c => c.code === 'tri_primary_component_dose' && c.status === 'pending').length,
          pendingChecks: [...new Set(p.checks.filter(c => c.status === 'pending').map(c => c.code))] });
      }, 120_000);
    }
  });
}

if (selected.some(s => s.objective === '703')) {
  it('changes prescribed sessions when the coach promotes another diagnosed 70.3 limiter', async () => {
    const half = scenarios.find(s => s.objective === '703')!;
    const initial = inputFor(half, 'trained', 'elite');
    const ranked = initial.config.identifiedLimitersRaw ?? [];
    expect(ranked[0]).toBe('VLamax');
    expect(ranked).toContain('TTE');
    const promoted = ['TTE', ...ranked.filter(limiter => limiter !== 'TTE')];
    const again = inputFor(half, 'trained', 'elite', promoted);
    const proposal = async (input: typeof initial) => {
      const plan = await generateDetPlanFromPageInput(input);
      return (plan as typeof plan & { _detSourceProposal: V3PlanProposal })._detSourceProposal;
    };
    const original = await proposal(initial);
    const changed = await proposal(again);
    expect(changed.limiterOrder).toEqual(promoted);
    const keyBlocks = (p: V3PlanProposal) => p.weeks
      .filter(w => w.weekType === 'load')
      .map(w => w.days.flatMap(d => d.sessions)
        .filter(s => s.role === 'key' || s.role === 'long')
        .flatMap(s => s.components.map(c => [c.sport, c.sourceId, c.blocks])));
    expect(keyBlocks(changed)).not.toEqual(keyBlocks(original));
    const doseReports = changed.checks.filter(c => c.code === 'tri_primary_component_dose');
    expect(doseReports.length).toBeGreaterThan(0);
    expect(doseReports.every(c => c.message.startsWith('TTE'))).toBe(true);
  }, 120_000);
}
