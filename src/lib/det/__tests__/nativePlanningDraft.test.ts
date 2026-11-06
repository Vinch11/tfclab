import { beforeAll,describe,it,expect,vi } from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import { computeAppAthleteContext,buildAppPlanConfig,type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { freezeAppPlanningInput,planningInputFor } from '../appPlanningInput';
import { constructDeterministicPlan,type ExperimentalAssemblyContract } from '../../../../experimental/det-engine/engine';
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

beforeAll(()=>{vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});});
const guards:ExperimentalAssemblyContract={
 id:'common-catalogue-pre-review-study',
 adapt:()=>{},
 enforceWeeklyHoursCap:true,
 requireNativePolarizationOnLoadWeeks:true,
 requireMeasuredDeloadSelection:true,
 annotateVerifiedDeloads:true,
 requireRealQualityOnLoadWeeks:true,
 requireLorangQualityBeforeFinalValidation:true,
 classifyNativeSourceKeySessions:true,
 prioritizeNativeQualityAndEasyMargin:true,
 excludeNativeForbiddenTaperCandidates:true,
 useDeclaredEventDurationEstimates:true,
};
describe('actual native assembly before any athlete/source approval',()=>{
 it.each([{objective:'Semi',weeks:8,hours:6,target:'95'},{objective:'Marathon',weeks:16,hours:8,target:'195'},{objective:'Marathon',weeks:40,hours:9,target:'195'}])('$objective: selected complete candidate passes every unchanged final gate',async c=>{
  const app=await shared(c.objective,c.weeks,c.hours,undefined,{raceTargetMinutes:c.target});
  const input=planningInputFor(app,'det'),before=JSON.stringify(app);
  const out=constructDeterministicPlan(input.athlete,input.config,{maxNodes:150000,maxMilliseconds:30000},guards);
  expect(out.constraintsSatisfied,JSON.stringify({reason:out.reason,hard:out.issues.filter(i=>['error','critical','blocking'].includes(i.severity))})).toBe(true);
  expect(out.candidate?.weeks).toHaveLength(c.weeks);
  expect(out.limiterPriorities).toEqual(app.limiters.applied);
  expect(out.humanReviewRequired).toBe(true);expect(out.sportingRelevance).toBe('not_attested');
  expect(JSON.stringify(app)).toBe(before);
  expect(out.issues.filter(i=>['error','critical','blocking'].includes(i.severity))).toEqual([]);
  for(const week of out.candidate!.weeks){
    expect(week.sessions.every(s=>s.isRest||s.title.startsWith('COURSE :')||!!s.catalogId)).toBe(true);
    expect(week.sessions.reduce((sum,s)=>sum+(s.isRest?0:s.durationMin??0),0)).toBeLessThanOrEqual(c.hours*60);
  }
 },60000);
 it('refuses a week containing only easy sources instead of granting quality from its slot labels',async()=>{
  const app=await shared('Semi',8,6,undefined,{raceTargetMinutes:'95'}),input=planningInputFor(app,'det');
  const out=constructDeterministicPlan(input.athlete,input.config,{maxNodes:25000,maxMilliseconds:10000},{...guards,filterCandidate:card=>card.mainZoneMax<=2});
  expect(out.constraintsSatisfied).toBe(false);
 },30000);
});

it('refuses native count-ratio failures even after the synthetic 70.3 source-gap probe completes',async()=>{
 const app=await shared('Ironman 70.3',12,10,undefined,{raceTargetMinutes:'330'}),input=planningInputFor(app,'det');
 const proposed:import('../../../../supabase/functions/_shared/repairSportingEquivalence').RepairWorkoutMetadata={
  metadataVersion:1,complete:true,id:'SYNTHETIC_STUDY_703_BASE_180',sport:'brick',
  title:'SYNTHETIC STUDY ONLY — base aerobic composition',objective:'Endurance contrôlée',
  intentFamily:'brick',goals:['half'],objectiveSpecific:true,phases:['base'],durationMin:[180,180],
  mainZoneMax:2,specialContext:null,prerequisiteKeys:[],necessity:'Optionnel',
  when:'Base — synthetic source-domain probe only',avoid:'No athlete approval',
  tags:['synthetic-test-only-not-athlete-approved'],
  structure:'Vélo 139 min Z2 | Transition planifiée 6 min | Course 35 min Z1-Z2',zones:['Z1','Z2'],
 };
 const out=constructDeterministicPlan(input.athlete,input.config,{maxNodes:150000,maxMilliseconds:30000},{
  ...guards,adapt:prepared=>{
   prepared.phaseRepairCatalogs.base.push(proposed);
   for(const catalogue of prepared.chunkRepairCatalogs)catalogue.push(proposed);
   prepared.allowedCatalogIds.push(proposed.id);
  },
 });
 process.stdout.write('ASSEMBLY_SOURCE_DOMAIN_DIAGNOSTIC '+JSON.stringify({objective:'703',status:out.status,reason:out.reason,constraintsSatisfied:out.constraintsSatisfied,constructed:out.technicallyConstructed,weeks:out.candidate?.weeks.length,hard:out.issues.filter(i=>['critical','blocking','error'].includes(i.severity)).slice(0,10),trace:out.trace.slice(-2),syntheticSourceOnly:true,sourceOrAthleteApprovalCreated:false})+'\n');
 expect(out.technicallyConstructed).toBe(true);
 expect(out.constraintsSatisfied).toBe(false);
 expect(out.issues.some(issue=>issue.code==='sport_ratio'&&issue.severity==='error')).toBe(true);
 expect(out.humanReviewRequired).toBe(true);expect(out.sportingRelevance).toBe('not_attested');
},60000);

it('refuses a technically assembled native semi30 with five consecutive non-deload weeks',async()=>{
 const app=await shared('Semi',30,6,undefined,{raceTargetMinutes:'95'}),input=planningInputFor(app,'det');
 const out=constructDeterministicPlan(input.athlete,input.config,{maxNodes:150000,maxMilliseconds:30000},guards);
 expect(out.technicallyConstructed).toBe(true);
 expect(out.constraintsSatisfied).toBe(false);
 expect(out.issues.some(issue=>issue.code==='load_pattern'&&issue.severity==='error')).toBe(true);
 expect(out.humanReviewRequired).toBe(true);expect(out.sportingRelevance).toBe('not_attested');
},60000);
