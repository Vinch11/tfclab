import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { buildAppPlanConfig, computeAppAthleteContext, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { DetRefusal, detSupportsObjective, generateDetPlanFromPageInput } from '@/lib/plan/detEngineRun';
import { auditV3Catalogue } from '../../library-v3/catalogueRuntime';
import { v3ExtendedCatalogue } from '../../library-v3/supplementalCatalogue';
import { parseV3PlanProposal } from '@/lib/det/v3ProposalLocalSave';
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

function inputFor(s: Scenario, trainingLevel: string, ambition: string, coachOrder: string[] = [], history: Partial<Pick<AppPlanFormState,'recentWeeklyHours' | 'recentWeeksCount'>> = {}) {
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
    maxDoubleDaysPerWeek: '', coachLimiterOrder: coachOrder, currentAthleteId: id, ...history,
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
          weeksWithTrailDose: p.checks.filter(c => c.code === 'trail_primary_dose' && c.status === 'passed').length,
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

for (const trail of selected.filter(s => s.objective.startsWith('Trail'))) {
  it(trail.objective + ' produces reviewable terrain sessions within the coach limits', async () => {
    const input = inputFor(trail, 'trained', 'competitor');
    const limits = { recentMinutes: 100, peakMinutes: 150 };
    const plan = await generateDetPlanFromPageInput({ ...input, trailLongRunLimits: limits });
    const p = (plan as typeof plan & { _detSourceProposal: V3PlanProposal })._detSourceProposal;
    expect(parseV3PlanProposal(JSON.parse(JSON.stringify(p))).trailLongRunLimits).toEqual(limits);
    expect(p.weeks).toHaveLength(trail.weeks);
    expect(p.prescriptionAllowed).toBe(false);
    const runSessions = plan.weeks.flatMap(w => w.sessions).filter(s => s.sport === 'run' && s.catalogId);
    expect(runSessions.length).toBeGreaterThan(0);
    expect(runSessions.every(s => s.detStructureRefusal?.reason === 'run_terrain_effort_review_required' && !s.detStructuredWorkout)).toBe(true);
    expect(p.checks.some(c => c.code === 'trail_route_review' && c.status === 'pending')).toBe(true);
    for (const w of p.weeks) {
      for (const session of w.days.flatMap(d => d.sessions).filter(s => s.sport === 'run' && s.role !== 'race')) {
        expect(session.durationMinutes).toBeGreaterThan(0);
        expect(session.knownMinutes).toBeLessThanOrEqual(w.week === 1 ? limits.recentMinutes : limits.peakMinutes);
        expect(session.components.every(c => c.targets.status === 'unresolved' && c.targets.targets.length === 0)).toBe(true);
      }
    }
    if (process.env.DET_TRAIL_EXAMPLES) writeFileSync(process.env.DET_TRAIL_EXAMPLES + '/' + trail.objective + '.json', JSON.stringify(p));
    await expect(generateDetPlanFromPageInput({ ...input, trailLongRunLimits: {recentMinutes:100,peakMinutes:50} })).rejects.toThrow();
  }, 120_000);
}

if (selected.some(s => s.objective === 'TrailShort')) {
  it('refuses an unsupported trail calendar or flat-only terrain', async () => {
    const input = inputFor(scenarios.find(s => s.objective === 'TrailShort')!, 'trained', 'competitor');
    await expect(generateDetPlanFromPageInput({...input, config:{...input.config, terrainAvailability:'plat'}})).rejects.toThrow(/relief/);
    const raceGoals = input.config.raceGoals!.map(g => ({...g, raceDate:'2026-11-22'}));
    await expect(generateDetPlanFromPageInput({...input, config:{...input.config, raceGoals}})).rejects.toThrow(/dernière semaine/);
  });
}

if (selected.some(s => s.objective === 'TrailShort')) {
  it('uses recent training and introductory strength in a trail return to training', async () => {
    const ids = ['V3P_STRENGTH_217','V3P_STRENGTH_218','V3P_RUN_203','V3P_RUN_204','V3P_RUN_205'];
    const workouts = v3ExtendedCatalogue.workouts.filter(w=>ids.includes(w.id));
    expect(auditV3Catalogue({...v3ExtendedCatalogue, workouts, count:5, counts:{run:3,strength:2,swim:0,bike:0}})).toEqual([]);
    const scenario = {objective:'TrailShort',weeks:12,hours:3,distanceKm:8,elevationM:150};
    const input = inputFor(scenario, 'untrained', 'finisher');
    await expect(generateDetPlanFromPageInput(input)).rejects.toThrow(/renseigner le volume hebdomadaire récent/);
    const withHistory = inputFor(scenario, 'untrained', 'finisher', [], {recentWeeklyHours:'3',recentWeeksCount:'4'});
    const plan = await generateDetPlanFromPageInput({...withHistory, trailLongRunLimits:{recentMinutes:50,peakMinutes:75}});
    const p = (plan as typeof plan & { _detSourceProposal:V3PlanProposal })._detSourceProposal;
    expect(p.weeks[0].knownMinutes).toBeLessThanOrEqual(180);
    const longs = p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.filter(s=>s.role==='long').map(s=>s.knownMinutes)));
    expect(longs[0]).toBeLessThanOrEqual(50);
    expect(longs.at(-1)).toBeGreaterThan(longs[0]);
    expect(Math.max(...longs)).toBeLessThanOrEqual(75);
    const exercises = p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
    const strength = exercises.filter(c=>c.sport==='strength');
    expect(strength.length).toBeGreaterThan(0);
    expect(strength.every(c=>['V3P_STRENGTH_217','V3P_STRENGTH_218'].includes(c.sourceId) && c.durationMinutes===12)).toBe(true);
    expect(exercises.every(c=>c.review.minimumLevel==='untrained')).toBe(true);
    if(process.env.DET_TRAIL_EXAMPLES) writeFileSync(process.env.DET_TRAIL_EXAMPLES+'/TrailReturn.json', JSON.stringify(p));
  }, 120_000);
}


for (const scenario of selected.filter(s=>['10K','Semi','Marathon','703','IM'].includes(s.objective))) {
  it(scenario.objective + ' respects the recent weekly volume independently of ambition and availability', async () => {
    const ambition = scenario.objective==='IM'?'finisher':'competitor';
    const withRecent = (hours:string) => inputFor(scenario,'trained',ambition,[],{recentWeeklyHours:hours,recentWeeksCount:'4'});
    await expect(generateDetPlanFromPageInput(withRecent('0.5'))).rejects.toThrow(/S1.*30 min hebdomadaires récemment réalisées/);
    const baseline = inputFor(scenario,'trained',ambition);
    const plan = await generateDetPlanFromPageInput(baseline);
    const readProposal = (value:typeof plan)=>(value as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    const previous = readProposal(plan);
    expect(previous.checks.some(c=>c.code==='initial_recent_volume')).toBe(false);
    const hours = Math.ceil(previous.weeks[0].knownMinutes / 60);
    const constrained = readProposal(await generateDetPlanFromPageInput(withRecent(String(hours))));
    expect(constrained.limiterOrder).toEqual(previous.limiterOrder);
    const first = constrained.weeks[0];
    {
      const lowerHours = Math.floor(previous.weeks[0].knownMinutes*.85/6)/10;
      try{
        const reduced = readProposal(await generateDetPlanFromPageInput(withRecent(String(lowerHours))));
        expect(reduced.weeks[0].knownMinutes).toBeLessThanOrEqual(lowerHours*60+1e-7);
        expect(reduced.weeks[0].knownMinutes).toBeLessThan(previous.weeks[0].knownMinutes);
        if(process.env.DET_COMPARE_RECENT) process.stdout.write('RECENT_COMPARE '+JSON.stringify({objective:scenario.objective,ambition,available:scenario.hours,baseline:previous.weeks[0].knownMinutes,recentMax:lowerHours*60,actual:reduced.weeks[0].knownMinutes})+'\n');
      }catch(error){
        if(!(error instanceof DetRefusal)||['Semi','Marathon'].includes(scenario.objective))throw error;
        if(process.env.DET_COMPARE_RECENT) process.stdout.write('RECENT_COMPARE '+JSON.stringify({objective:scenario.objective,ambition,available:scenario.hours,baseline:previous.weeks[0].knownMinutes,recentMax:lowerHours*60,reason:error.reasons})+'\n');
      }
    }
    expect(first.knownMinutes).toBeLessThanOrEqual(hours*60);
    expect(constrained.checks.find(c=>c.code==='initial_recent_volume')?.status).toBe(first.durationMinutes===null?'pending':'passed');
  },120_000);
}
