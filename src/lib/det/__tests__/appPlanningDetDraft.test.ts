import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { planningInputFor } from '../appPlanningInput';
import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { computeAppAthleteContext, buildAppPlanConfig, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { freezeAppPlanningInput } from '../appPlanningInput';
import { buildAppPlanningDetDraft } from '../appPlanningDetDraft';
import { findSource } from '../coachDetContext';

const ATHLETE = 'SYNTHETIC_DRAFT_A';
async function shared(objective = 'Ironman 70.3', weeks = 12, hours = 10, limiters?: string[], overrides: Partial<AppPlanFormState> = {}) {
  const athlete = { id: ATHLETE, name: 'SYNTHETIC DRAFT ONLY', birth_date: '1991-01-01', sex: 'M', active_snapshot_id: 'SYNTH_SNAP', refs: {} };
  const snapshots = [{ id: 'SYNTH_SNAP', athlete_id: ATHLETE, date: '2026-11-04', source: 'manual', sport_main: 'tri', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240, tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188 }];
  const ctx = computeAppAthleteContext(athlete, objective, 'age_group', { snapshots, tests: [], checkins: [] })!;
  const st: AppPlanFormState = { objective, ambition: 'age_group', planStartDate: new Date(2026,10,2), raceName: '', raceDate: new Date(Date.UTC(2026,10,2 + weeks * 7 - 1)).toISOString().slice(0,10), raceFormat: 'continuous', raceGoals: [], trailDistanceKm: '', trailElevationM: '', trailTargetTimeH: '', trailMaxAltitudeM: '', weeksAvailable: weeks, weeklyHours: String(hours), sessionsPerWeek: /Ironman/.test(objective) ? '8' : '4', maxSessionsPerDay: '2', strengthSessionsPerWeek: '1', deloadCadence: 'auto', constraints: '', trainingLevel: 'auto', terrainAvailability: 'auto', lockAmbition: false, crossTrainingVelo: false, crossTrainingNatation: false, chronicWeeklyHours: '', recentWeeklyHours: '', recentWeeksCount: '', maxDoubleDaysPerWeek: '', coachLimiterOrder: [], currentAthleteId: ATHLETE, ...overrides };
  const config = buildAppPlanConfig(ctx.diagnostic, st);
  if (limiters) {
    // Isolated prioritization probe: no competing prohibition/risk filter.
    // The real unmodified-pipeline cases above/below retain those filters.
    config.identifiedLimitersRaw = limiters; config.prohibitions = []; config.injuryRisk = undefined;
  }
  return freezeAppPlanningInput({ athleteId: ATHLETE, athlete: ctx.data, config, planStartDate: '2026-11-02', appAutomaticLimiters: config.identifiedLimitersRaw ?? [], coachOverride: limiters ?? null });
}
beforeAll(() => { vi.spyOn(console,'log').mockImplementation(() => {}); vi.spyOn(console,'warn').mockImplementation(() => {}); vi.spyOn(globalThis,'fetch').mockImplementation(() => { throw Error('NETWORK_FORBIDDEN'); }); });

describe('pre-review DET study uses the actual shared app planning context', () => {
  it.each(['Marathon','Semi','10K','Ironman 70.3','Ironman'])('%s: Auto frequency uses the unchanged IA weekly calendar',async objective=>{
    const input=await shared(objective,16,8,['TTE'],{sessionsPerWeek:'',strengthSessionsPerWeek:'2'});
    const before=JSON.stringify(input);
    expect(input.config.sessionsPerWeek).toBeUndefined();
    const calendar=prepareGenerationContracts(input.athlete,input.config).weeklyQuotas;
    const draft=await buildAppPlanningDetDraft(input,ATHLETE);
    for(const week of draft.weeks){
      const layout=calendar[week.week].layout!;
      expect(week.days.map(d=>d.slots.map(s=>s.sport))).toEqual(layout.days.map(d=>d.slots.map(s=>s.sport)));
    }
    expect(JSON.stringify(input)).toBe(before);
  },60000);
  it.each([0,-1,2.5,NaN,Infinity,null])('refuses an explicitly invalid frequency %s instead of interpreting it as Auto',async value=>{
    const base=await shared();
    const input=await freezeAppPlanningInput({athleteId:ATHLETE,athlete:base.athlete,config:{...base.config,sessionsPerWeek:value as number},planStartDate:base.config.planStartDate!,appAutomaticLimiters:base.limiters.appAutomatic,coachOverride:null});
    await expect(buildAppPlanningDetDraft(input,ATHLETE)).rejects.toThrow('Complétez');
  });
  it.each([['Ironman 70.3',12,10],['Marathon',40,8],['Semi',8,6]] as const)('%s: full horizon without manual paces, clocks or review flags', async (objective,weeks,hours) => {
    const app = await shared(objective,weeks,hours), original = JSON.stringify(app);
    const draft = await buildAppPlanningDetDraft(app,ATHLETE);
    expect(draft.kind).toBe('planning_draft'); expect(draft.prescriptionAllowed).toBe(false); expect(draft.validation).toBe('pending');
    expect(draft.weeks).toHaveLength(weeks); expect(draft.weeks.every(w => w.days.length === 7)).toBe(true);
    expect(draft.limiterOrder).toEqual(app.limiters.applied); expect(draft.planningInputFingerprint).toBe(app.fingerprint);
    const candidates = draft.weeks.flatMap(w=>w.days.flatMap(d=>d.slots.flatMap(s=>s.candidates)));
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(c => findSource(c.id)?.title === c.title)).toBe(true);
    expect(JSON.stringify(app)).toBe(original);
    expect(JSON.stringify(draft)).not.toContain('individualCoachApproval');
    expect(JSON.stringify(draft)).not.toContain('coach_confirmed');
    expect(draft).toEqual(await buildAppPlanningDetDraft(app,ATHLETE));
  },60000);
  it('preserves a changed primary and changes the corresponding source shortlist', async () => {
    const vo2 = await buildAppPlanningDetDraft(await shared('Marathon',16,8,['VO2max']),ATHLETE);
    const tte = await buildAppPlanningDetDraft(await shared('Marathon',16,8,['TTE']),ATHLETE);
    const hits = (draft: typeof vo2) => draft.limiterCandidates[0].sources;
    expect(hits(vo2).length).toBeGreaterThan(0); expect(hits(tte).length).toBeGreaterThan(0);
    expect(hits(vo2).every(c=>c.primaryDomain==='vo2max')).toBe(true);
    expect(hits(tte).every(c=>c.primaryDomain==='mlss')).toBe(true);
    expect(hits(vo2).map(c=>c.id)).not.toEqual(hits(tte).map(c=>c.id));
  },60000);
  it('shares all six recurring priorities with the AI prompt and preserves a regenerated window', async () => {
    const labels=['TTE','VO2max','VLamax','FTP','Économie','FatMax'];
    const app=await shared('Marathon',40,8,labels);
    const draft=await buildAppPlanningDetDraft(app,ATHLETE);
    const {athlete,config}=planningInputFor(app,'det');
    const prepared=prepareGenerationContracts(athlete,config);
    expect(draft.limiterMesocycles).toEqual(prepared.limiterMesocycles);
    expect(prepared.limiterMesocycles.priorities).toEqual(labels);
    expect(prepared.limiterMesocycles.blocks.slice(0,7).map(block=>block.focus)).toEqual([...labels,labels[0]]);
    expect(prepared.quotasByChunkText.join('\n')).toContain('focus FatMax');
    const window=prepareGenerationContracts(athlete,{...config,weeksAvailable:8,globalTotalWeeks:40,globalWeekOffset:20});
    for(let local=1;local<=8;local++) expect(window.limiterMesocycles.byWeek[local].focus).toBe(prepared.limiterMesocycles.byWeek[local+20].focus);
    expect(JSON.stringify(app.config.identifiedLimitersRaw)).toBe(JSON.stringify(labels));
  },60000);
  it('retains day bans and reported contraindications without turning unknown checks into approval', async () => {
    const app = await shared('Ironman 70.3',12,10,undefined,{constraints:'Pas de vélo le mardi'});
    const draft = await buildAppPlanningDetDraft(app,ATHLETE,{injuryScreen:'contraindication'});
    expect(draft.weeks.every(w=>!w.days[1].slots.some(s=>s.sport==='bike'))).toBe(true);
    expect(draft.weeks.flatMap(w=>w.days.flatMap(d=>d.slots.flatMap(s=>s.candidates)))).toEqual([]);
    expect(draft.pending.some(p=>p.includes('douleurs'))).toBe(true);
  },60000);
  it('refuses another athlete, mutated input, inconsistent priorities and unknown primary', async () => {
    const app = await shared();
    await expect(buildAppPlanningDetDraft(app,'OTHER')).rejects.toThrow('différent');
    await expect(buildAppPlanningDetDraft({...app,athlete:{...app.athlete,ftp:301}},ATHLETE)).rejects.toThrow('modifié');
    await expect(buildAppPlanningDetDraft({...app,limiters:{...app.limiters,applied:['TTE']}},ATHLETE)).rejects.toThrow('incohérent');
    await expect(buildAppPlanningDetDraft(await shared('Marathon',16,8,['unknown primary']),ATHLETE)).rejects.toThrow('non raccordé');
  });
});
