import {preparePlan} from '../../../supabase/functions/_shared/nolioV2/planDryRun';
import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {raceIdentityOf} from '../../../supabase/functions/_shared/nolioV2/plannedMapper';
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
// The 25 previously refused complete inputs at d076c4e. A recorded
// refusal on any of these cases is a regression, even if the suite can log it.
const rankedRegressionCases:Record<string,string[]>={
  Marathon:['auto/elite','auto/world_class','trained/elite','trained/world_class','highly_trained/elite'],
  TrailShort:['auto/elite','light/competitor','light/elite','trained/elite','highly_trained/elite'],
  TrailMountain:['auto/elite','auto/world_class','light/age_group','light/competitor','light/elite','trained/elite','trained/world_class','highly_trained/elite','highly_trained/world_class'],
  TrailUltra:['auto/elite','auto/world_class','trained/elite','trained/world_class','highly_trained/elite','highly_trained/world_class'],
};
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
  const tri = ['703','IM','Sprint','Olympic'].includes(s.objective);
  const dedicated=s.objective.startsWith('Cyclisme')||s.objective.startsWith('Natation');
  const id = 'SYNTHETIC_DET_' + s.objective;
  const athlete = { id, name: 'Synthetic', objectif: dedicated?'703':s.objective, birth_date: '1988-03-11',
    sex: 'M', active_snapshot_id: 'SYNTHETIC_SNAPSHOT', refs: {} };
  const snapshot = { id: athlete.active_snapshot_id, athlete_id: id, date: '2026-11-04', source: 'manual',
    sport_main: tri ? 'tri' : s.objective.startsWith('Cyclisme') || s.objective==='CLM' ? 'bike' : s.objective.startsWith('Natation') ? 'swim' : 'run', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240,
    tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188,
    ...(s.objective === '10K' ? { tte_observed_min_run: 25 } : {}) };
  const context = computeAppAthleteContext(athlete, s.objective, ambition, { snapshots: [snapshot], tests: [], checkins: [], programmeTarget:s.objective==='Cyclisme FTP'?320:s.objective==='Natation 1500m'?90:undefined });
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
          if (!(error instanceof DetRefusal)||rankedRegressionCases[scenario.objective]?.includes(level+'/'+ambition)) throw error;
          emit({ ...row, ...diagnostic, status: 'refused', reasons: error.reasons });
          return;
        }
        const p = (plan as typeof plan & { _detSourceProposal: V3PlanProposal })._detSourceProposal;
        expect(p.limiterOrder).toEqual(diagnostic.limiters);
        expect(p.weeks).toHaveLength(scenario.weeks);
        expect(p.checks.filter(c => c.status === 'blocked')).toEqual([]);
        if(process.env.DET_PLAN_DETAILS)appendFileSync(process.env.DET_PLAN_DETAILS,JSON.stringify({...row,weeks:p.weeks.map(w=>({
          n:w.week,type:w.weekType,minutes:w.knownMinutes,sessions:w.days.flatMap(d=>d.sessions.map(s=>({sport:s.sport,role:s.role,minutes:s.knownMinutes,ids:s.components.map(c=>c.sourceId)})))
        }))})+'\n');
        if(rankedRegressionCases[scenario.objective]?.includes(level+'/'+ambition)){
          for(const [i,label] of p.limiterOrder.entries()){
            expect(p.checks.some(c=>['ranked_limiter_work','ranked_limiter_deferred'].includes(c.code)&&c.message.startsWith('Rang '+(i+1)+' · '+label))).toBe(true);
          }
        }
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

if (selected.some(s => s.objective === 'IM')) {
  it('exports the complete trained competitor Ironman after catalogue expansion', async () => {
    const scenario = scenarios.find(s => s.objective === 'IM')!;
    const input = inputFor(scenario, 'trained', 'competitor');
    const plan = await generateDetPlanFromPageInput(input);
    const proposal = (plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    const loads = proposal.weeks.filter(w => w.weekType === 'load');
    const evidence = proposal.checks.filter(c => c.code === 'tri_primary_component_dose' && c.status === 'passed');
    expect(evidence.map(c => c.week)).toEqual(loads.map(w => w.week));
    expect(proposal.limiterOrder).toEqual(input.config.identifiedLimitersRaw);
    const finalWeeks=proposal.weeks.filter(w=>['taper','race'].includes(w.weekType));
    expect(finalWeeks).toHaveLength(4);
    const preTaper=loads.slice(-3).reduce((sum,w)=>sum+w.knownMinutes,0)/3;
    expect(finalWeeks[0].knownMinutes).toBeGreaterThan(preTaper*.5);
    expect(finalWeeks[0].knownMinutes).toBeLessThan(preTaper*.8);
    for(const [i,week] of finalWeeks.entries()){
      if(i)expect(week.knownMinutes).toBeLessThan(finalWeeks[i-1].knownMinutes);
      expect(plan.weeks[week.week-1].coachNotes).toContain('Compétition et transitions exclues');
    }
    const saved = JSON.parse(JSON.stringify(plan));
    const sessions = sessionsFromPlanJson(saved).sessions;
    const competition = sessions.map(raceIdentityOf).find(r => r !== null)!;
    const refs = {synthetic:true, athleteId:'usr_SYNTHETIC', competition,
      sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
    const full = await preparePlan(saved,refs,'SYNTHETIC_IM');
    expect(full.precheck.complete).toBe(true);
    expect(full.precheck.weeks).toBe(scenario.weeks);
    const key = sessions.find(s => s.sport === 'run' && s.catalogId)!.sessionKey;
    for (const scope of [{kind:'weeks',from:1,to:1},{kind:'sessions',keys:[key]}]) {
      const part = await preparePlan(saved,refs,'SYNTHETIC_IM',scope);
      expect(part.precheck.complete).toBe(true);
      expect(part.ops.length).toBeGreaterThan(0);
      expect(part.ops.every(op => full.ops.some(all => all.sessionKey === op.sessionKey && all.bodySha256 === op.bodySha256))).toBe(true);
    }
    if (process.env.DET_CASE_EVIDENCE) writeFileSync(process.env.DET_CASE_EVIDENCE,JSON.stringify({
      limiters:proposal.limiterOrder,minutes:proposal.weeks.map(w => w.knownMinutes),loadWeeks:loads.length,
      firstDose:evidence[0].message,operations:full.ops.length
    }));
  },120000);
}

if (selected.some(s => s.objective === '703')) {
  it('changes work blocks when only secondary coach priorities swap', async () => {
    const scenario=scenarios.find(s=>s.objective==='703')!;
    const automatic=inputFor(scenario,'trained','elite').config.identifiedLimitersRaw!;
    expect(automatic.length).toBeGreaterThanOrEqual(3);
    const reordered=[automatic[0],automatic[2],automatic[1],...automatic.slice(3)];
    const generate=async (order:string[])=>{
      const input=inputFor(scenario,'trained','elite',order);
      const plan=await generateDetPlanFromPageInput(input);
      const p=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
      expect(p.limiterOrder).toEqual(order);
      for(const [i,label] of order.entries())expect(p.checks.some(c=>c.code==='ranked_limiter_work'&&c.message.startsWith('Rang '+(i+1)+' · '+label+' ·'))).toBe(true);
      return {order:p.limiterOrder,weeks:p.weeks.map((w,i)=>{
        const checked=p.checks.filter(c=>c.code==='ranked_limiter_work'&&c.week===w.week);
        for(const check of checked)expect(plan.weeks[i].coachNotes).toContain(check.message);
        return w.days.flatMap(d=>d.sessions.flatMap(s=>s.components.map(c=>c.blocks)));
      })};
    };
    const original=await generate(automatic);
    const changed=await generate(reordered);
    const changedWeeks=changed.weeks.flatMap((w,i)=>JSON.stringify(w)!==JSON.stringify(original.weeks[i])?[i+1]:[]);
    expect(changedWeeks.length).toBeGreaterThan(0);
    process.stdout.write('RANKED_COACH_BLOCKS '+JSON.stringify({original:original.order,changed:changed.order,changedWeeks})+'\n');
  },120000);
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
  if(trail.objective==='TrailUltra'){
    it('honours a diagnosed FatMax moved to first place in the normal trail form',async()=>{
      const raw=inputFor(trail,'trained','competitor').config.identifiedLimitersRaw!;
      expect(raw).toContain('FatMax');
      const ordered=['FatMax',...raw.filter(label=>label!=='FatMax')];
      const plan=await generateDetPlanFromPageInput(inputFor(trail,'trained','competitor',ordered));
      const proposal=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
      expect(proposal.limiterOrder).toEqual(ordered);
      for(const w of proposal.weeks.filter(w=>w.weekType==='load')){
        expect(w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)).some(c=>c.limiterMatches.includes('FatMax'))).toBe(true);
        expect(plan.weeks[w.week-1].coachNotes).toMatch(/Rang 1 · FatMax · .+min de travail/);
      }
    },120_000);
  }
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
        const reducedPlan = await generateDetPlanFromPageInput(withRecent(String(lowerHours)));
        const reduced = readProposal(reducedPlan);
        const saved = JSON.parse(JSON.stringify(reducedPlan));
        const sessions = sessionsFromPlanJson(saved).sessions;
        const race = sessions.map(raceIdentityOf).find(r=>r!==null)!;
        const refs = {synthetic:true,athleteId:'usr_SYNTHETIC',sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},
          exerciseIds:{},competition:{date:race.date,name:race.name,sport:race.sport}};
        const version = 'SYNTHETIC_LOAD_'+scenario.objective;
        const whole = await preparePlan(saved,refs,version);
        expect(whole.precheck.complete, JSON.stringify(whole.precheck.rows.filter(r=>r.status==='refused'))).toBe(true);
        expect(whole.precheck.weeks).toBe(scenario.weeks);
        const key = sessions.find(s=>!s.isRest && s.sport==='run' && s.catalogId)!.sessionKey;
        for(const scope of [{kind:'weeks',from:1,to:1},{kind:'sessions',keys:[key]}]){
          const part = await preparePlan(saved,refs,version,scope);
          expect(part.precheck.complete).toBe(true);
          expect(part.ops.every(op=>whole.ops.find(o=>o.sessionKey===op.sessionKey)?.bodySha256===op.bodySha256)).toBe(true);
        }
        expect(reduced.weeks[0].knownMinutes).toBeLessThanOrEqual(lowerHours*60+1e-7);
        expect(reduced.weeks[0].knownMinutes).toBeLessThan(previous.weeks[0].knownMinutes);
        expect(reduced.limiterOrder).toEqual(previous.limiterOrder);
        expect(reduced.weeks).toHaveLength(scenario.weeks);
        expect(reduced.checks.some(c=>c.status==='blocked')).toBe(false);
        if(['703','IM'].includes(scenario.objective)){
          const loads = reduced.weeks.filter(w=>w.weekType==='load');
          const proven = reduced.checks.filter(c=>c.code==='tri_primary_component_dose'&&c.status==='passed');
          expect(proven.map(c=>c.week)).toEqual(loads.map(w=>w.week));
        }
        if(process.env.DET_COMPARE_RECENT) process.stdout.write('RECENT_COMPARE '+JSON.stringify({objective:scenario.objective,ambition,available:scenario.hours,baseline:previous.weeks[0].knownMinutes,recentMax:lowerHours*60,actual:reduced.weeks[0].knownMinutes,operations:whole.precheck.operations,weeks:whole.precheck.weeks})+'\n');
      }catch(error){
        if(!(error instanceof DetRefusal)||scenario.objective!=='10K')throw error;
        if(process.env.DET_COMPARE_RECENT) process.stdout.write('RECENT_COMPARE '+JSON.stringify({objective:scenario.objective,ambition,available:scenario.hours,baseline:previous.weeks[0].knownMinutes,recentMax:lowerHours*60,reason:error.reasons})+'\n');
      }
    }
    expect(first.knownMinutes).toBeLessThanOrEqual(hours*60);
    expect(constrained.checks.find(c=>c.code==='initial_recent_volume')?.status).toBe(first.durationMinutes===null?'pending':'passed');
  },120_000);
}


if(process.env.DET_EXTENDED_CASES) {
  const additional: Scenario[] = [
    {objective:'5K',weeks:8,hours:4,sessions:3},
    {objective:'5K',weeks:12,hours:6,sessions:4},
    {objective:'10K',weeks:12,hours:3,sessions:3},
    {objective:'Semi',weeks:16,hours:4,sessions:3},
    {objective:'Sprint',weeks:8,hours:8,sessions:7},
    {objective:'Olympic',weeks:12,hours:9,sessions:8},
    {objective:'Sprint',weeks:12,hours:10,sessions:8},
    {objective:'Olympic',weeks:16,hours:12,sessions:9},
    {objective:'Cyclisme FTP',weeks:8,hours:7,sessions:5},
    {objective:'Cyclisme contre-la-montre',weeks:8,hours:7,sessions:5},
    {objective:'Natation 1500m',weeks:8,hours:4,sessions:4},
    {objective:'Marathon',weeks:40,hours:8},
    {objective:'Semi',weeks:30,hours:7,sessions:4},
    {objective:'Cyclisme FTP',weeks:12,hours:9,sessions:4},
    {objective:'Natation 1500m',weeks:12,hours:6,sessions:5},
  ];
  it.each(additional)('vérifie le parcours de génération pour $objective ($weeks semaines)',async scenario=>{
    const level=(scenario.objective==='10K'||scenario.objective==='Semi'&&scenario.weeks===16)?'untrained':'trained';
    const ambition=level==='untrained'?'age_group':'competitor';
    if(!detSupportsObjective(scenario.objective)){emit({...scenario,level,ambition,status:'outside_det'});return;}
    const input=inputFor(scenario,level,ambition,[],{recentWeeklyHours:String(scenario.hours),recentWeeksCount:'4'});
    let plan;
    try {plan=await generateDetPlanFromPageInput(input);} catch(error){
      const expectedPlan=scenario.objective==='5K'||
        scenario.objective==='Marathon'||scenario.objective==='Semi'&&scenario.weeks===30||
        scenario.objective==='Cyclisme FTP'||['Natation 1500m','Sprint','Olympic'].includes(scenario.objective);
      if(!(error instanceof DetRefusal)||expectedPlan)throw error;
      emit({...scenario,level,ambition,status:'refused',reasons:error.reasons});return;
    }
    const proposal=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(proposal.weeks).toHaveLength(scenario.weeks);
    expect(proposal.limiterOrder).toEqual(input.config.identifiedLimitersRaw);
    const saved=JSON.parse(JSON.stringify(plan));
    const sessions=sessionsFromPlanJson(saved).sessions;
    const competition=sessions.map(raceIdentityOf).find(r=>r!==null);
    const refs={synthetic:true,athleteId:'usr_SYNTHETIC',competition,
      sportIds:{run:'spt_RUN',bike:'spt_BIKE',swim:'spt_SWIM',strength:'spt_STRENGTH',brick:'spt_TRI'},exerciseIds:{}};
    const whole=await preparePlan(saved,refs,'SYNTHETIC_EXTENDED');
    expect(whole.precheck.complete,JSON.stringify(whole.precheck.rows.filter(r=>r.status==='refused'))).toBe(true);
    const scoped=[];
    expect(whole.precheck.weeks).toBe(scenario.weeks);
    const key=sessions.find(s=>s.catalogId)!.sessionKey;
    for(const scope of [{kind:'weeks',from:1,to:1},{kind:'sessions',keys:[key]}]){
      const part=await preparePlan(saved,refs,'SYNTHETIC_EXTENDED',scope);
      expect(part.precheck.complete).toBe(true);
      expect(part.ops.length).toBeGreaterThan(0);
      expect(part.ops.every(op=>whole.ops.some(all=>all.sessionKey===op.sessionKey&&all.bodySha256===op.bodySha256))).toBe(true);
      scoped.push(part.ops.length);
    }
    emit({...scenario,level,ambition,status:'assembled',limiters:proposal.limiterOrder,
      firstWeek:proposal.weeks[0].knownMinutes,peak:Math.max(...proposal.weeks.map(w=>w.knownMinutes)),
      exportComplete:whole.precheck.complete,operations:whole.ops.length,scoped,
      exportProblems:whole.precheck.planProblems,refusedBlocks:whole.precheck.rows.filter(r=>r.status==='refused').map(r=>({
        reason:r.reason,sport:r.sport,title:r.title}))});
  },120000);
}

// Long-horizon regression: same ordinary form and diagnostic pipeline as a coach.
// Synthetic profiles, not a replay of a named athlete.
describe('multi-week repair acceptance',()=>{
  it.each([
    [32,18,10],[32,14,9],[32,14,8],[30,12,8],[32,18,12]
  ])('IM %i weeks %i hours %i slots',async(weeks,hours,sessions)=>{
    const input=inputFor({objective:'IM',weeks,hours,sessions},'trained','competitor');
    if(process.env.DET_LONG_FIXTURE && sessions===12)writeFileSync(process.env.DET_LONG_FIXTURE,JSON.stringify(input,null,2)+'\n');
    const plan=await generateDetPlanFromPageInput(input);
    const p=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(p.weeks.length).toBe(weeks);
    expect(p.weeks.every(w=>w.knownMinutes<=hours*60+1e-7)).toBe(true);
    expect(p.checks.filter(c=>c.status==='blocked')).toEqual([]);
    expect(p.limiterOrder).toEqual(input.config.identifiedLimitersRaw);
    process.stdout.write('REPAIR_CASE '+JSON.stringify({weeks,hours,sessions,repairs:p.checks.filter(c=>c.code==='adaptive_search'),limiters:p.limiterOrder})+'\n');
  },180000);
});
