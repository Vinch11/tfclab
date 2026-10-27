import {describe,it,expect,vi} from 'vitest';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {prevalidateGenerationScope} from '@/hooks/useAITrainingPlan';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prevalidatePlanWeeks,assertPlanPrevalidation} from '../../../../supabase/functions/_shared/planPrevalidation';
import {computeWeekQuotaEntry} from '@/engines/plan/sessionSizingMatrix';
import {buildWeeklySlotLayout} from '@/engines/plan/weeklySlotLayout';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {buildRepairWorkoutMetadata} from '@/lib/plan/repairCatalogMetadata';

describe('deterministic prevalidation without a model',()=>{
 it('blocks an impossible calendar before invoking a guarded callback and retains final validator codes',()=>{
  const entry=computeWeekQuotaEntry('10K','competitor',0,'load',false,{maxSessionsPerDay:1})!;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load');
  const report=prevalidatePlanWeeks([{week:1,globalWeek:1,phase:'base',weekType:'load',objective:'10K',...entry,layout,catalog:[]}]);
  expect(report.status).toBe('blocked');expect(report.issues.some(i=>i.code==='minimum_sessions_exceed_available_capacity')).toBe(true);
  const model=vi.fn();expect(()=>{assertPlanPrevalidation(report);model();}).toThrow('PLAN_PREVALIDATION_BLOCKED');expect(model).not.toHaveBeenCalled();
 });
 it('keeps unknown load and limited diversity as warnings, never mechanical contradictions',()=>{
  const entry=computeWeekQuotaEntry('10K','age_group',0,'load',false)!;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load',{availableSports:new Set(['run','strength'])});
  const catalog=['A_RUN_Z2_EASY','C_STR_BODYWEIGHT_HOME'].map(id=>buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id===id)!));
  const report=prevalidatePlanWeeks([{week:1,globalWeek:1,phase:'base',weekType:'load',objective:'10K',...entry,layout,catalog,volumeBudget:{maxMinutes:300,referenceSource:'internal-matrix',globalWeek:1,weeklyIncreasePctMax:.1}}]);
  expect(report.status).toBe('coach_review');expect(report.issues).toContainEqual({week:1,code:'coach_initial_load_unverified',severity:'warning'});
  expect(report.issues.some(i=>i.code==='catalogue_diversity_limited'&&i.severity==='warning')).toBe(true);
  expect(()=>assertPlanPrevalidation(report)).not.toThrow();
 });
 it('computes the actual B-10K fixture with weekly quotas, phases, pools and no request',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('OFFLINE_NETWORK_FORBIDDEN');});
  try{
   const overrides=process.env.TFCL_PREFLIGHT_OVERRIDES?JSON.parse(readFileSync(process.env.TFCL_PREFLIGHT_OVERRIDES,'utf8')):{};
   const fixture=preparePrevalidationFixture(process.env.TFCL_PREFLIGHT_FIXTURE??'B-10K',overrides);
   const report=prevalidateGenerationScope(fixture.athleteData,{...fixture.planConfig,_outputFormat:"json"});
   expect(report.weeks).toHaveLength(fixture.planConfig.weeksAvailable!);
   expect(report.weeks.every(w=>w.phase&&w.quota&&w.layout&&Array.isArray(w.eligible))).toBe(true);
   expect(fetch).not.toHaveBeenCalled();
   const out=process.env.TFCL_PREFLIGHT_OUTPUT;
   if(out){mkdirSync(out,{recursive:true});writeFileSync(`${out}/prevalidation.json`,JSON.stringify({fixture:process.env.TFCL_PREFLIGHT_FIXTURE??'B-10K',objective:fixture.planConfig.objective,ambition:fixture.planConfig.ambition,level:fixture.planConfig.ambitionMeta?.trainingLevel,weeks:fixture.planConfig.weeksAvailable,report},null,2));}
  }finally{fetch.mockRestore();vi.useRealTimers();}
 },60000);
});
it('blocks a window whose dominant phase contradicts the weekly prompt without selecting another phase',()=>{
 const entry=computeWeekQuotaEntry('10K','age_group',0,'load',false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load');
 const report=prevalidatePlanWeeks([{week:1,globalWeek:1,phase:'build',expectedPhase:'base',weekType:'load',objective:'10K',...entry,layout,catalog:[]}]);
 expect(report.status).toBe('blocked');expect(report.issues).toContainEqual({week:1,code:'window_phase_contract_conflict',severity:'blocking'});
 expect(report.weeks[0].phase).toBe('build');expect(report.weeks[0].expectedPhase).toBe('base');
});
import {prevalidateDeclaredCalendar} from '../../../../supabase/functions/_shared/planPrevalidation';
it('checks the actual dates of the 12-week 10K A and B events without inventing another event',()=>{
 const calendar={planStartDate:'2026-10-26',raceGoals:[{objective:'10K',raceDate:'2027-01-17'},{objective:'10K',raceDate:'2026-12-19'}]};
 expect(prevalidateDeclaredCalendar(calendar,12)).toEqual([]);
 expect(prevalidateDeclaredCalendar(calendar,10).some(i=>i.code==='declared_event_outside_plan'&&i.severity==='blocking')).toBe(true);
 expect(prevalidateDeclaredCalendar({...calendar,raceGoals:[{objective:'10K',raceDate:'2027-02-31'}]},12).some(i=>i.severity==='blocking')).toBe(true);
});
it('accepts a feasible fully specified contract without manufacturing a generated plan',()=>{
 const entry=computeWeekQuotaEntry('10K','finisher',0,'load',false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load',{availableSports:new Set(['run','strength'])});
 const catalog=['A_RUN_Z2_EASY','SEILER_RUN_Z1_RECOVERY_STRICT','LYDIARD_RUN_AEROBIC_BASE_MEDIUM','C_STR_BODYWEIGHT_HOME'].map(id=>buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id===id)!));
 const report=prevalidatePlanWeeks([{week:1,globalWeek:1,phase:'base',weekType:'load',objective:'10K',...entry,layout,catalog,volumeBudget:{maxMinutes:600,referenceSource:'coach',globalWeek:1,weeklyIncreasePctMax:.1}}]);
 expect(report.status).toBe('admissible');expect(report.issues).toEqual([]);
});
