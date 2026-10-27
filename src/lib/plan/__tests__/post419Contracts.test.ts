import {it,expect,vi,afterEach} from 'vitest';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {prevalidateGenerationScope} from '@/hooks/useAITrainingPlan';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {buildWindowRegenConfig} from '@/engines/plan/planWindowRegen';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {buildWeekQuotaTransport} from '@/lib/plan/weekQuotaTransport';
import {declaredRaceSlotsForWeek} from '../../../../supabase/functions/_shared/catalogueTrainingMinima';
import {effectiveSessionQuota} from '../../../../supabase/functions/_shared/sessionQuotaAccounting';
import {validateCoachVolumeBudgets} from '@/lib/plan/coachVolumeValidation';
import type {FinalValidationPlanLike} from '@/lib/plan/qa/checkB13';
afterEach(()=>vi.useRealTimers());
it('the recorded 70.3 distribution follows an explicit synthetic ban; do not silently change these sporting rules',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const spec=planningCases().find(c=>c.id==='703:light:competitor:unknown')!;
 const {prepared,weeks}=preparePlanningCaseContext(spec);
 expect(spec.constraints).toBe('heavily_constrained');expect(prepared.planConfig.constraints).toContain('natation interdite');
 expect(weeks).toBe(16);expect(prepared.planConfig.ambition).toBe('age_group');
 const report=prevalidateGenerationScope(prepared.athleteData,{...prepared.planConfig,_outputFormat:'json'});
 const q=report.weeks[0].quota!;
 expect((['swim','bike','run','brick','strength'] as const).map(s=>q[s].min)).toEqual([0,4,4,2,1]);
 expect(effectiveSessionQuota(q,2)).toMatchObject({bike:{min:2,max:2},totalSessions:{min:9,max:9}});
 expect(report.issues).toContainEqual({week:1,code:'coach_initial_load_unverified',severity:'warning'});
 // This is a different, unconstrained case, not a reinterpretation of the recipe.
 const unrestricted=preparePlanningCaseContext({...spec,constraints:'unrestricted'}).prepared;
 const alternative=prevalidateGenerationScope(unrestricted.athleteData,{...unrestricted.planConfig,_outputFormat:'json'});
 expect(alternative.weeks[0].quota!.swim.min).toBeGreaterThan(0);
});
it('the declared Corrida B survives config, full preparation, window transport and calendar reservation on its exact Saturday',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const raceGoals=[{objective:'10K',raceDate:'2027-01-17',priority:'A' as const},{objective:'10K',raceName:'Corrida synthétique',raceDate:'2026-12-19',priority:'B' as const}];
 const x=preparePrevalidationFixture('B-10K',{objective:'10K',planStartDate:'2026-10-26',weeksAvailable:12,trainingLevel:'light',weeklyHours:undefined,sessionsPerWeek:undefined,raceGoals});
 expect(x.planConfig.raceGoals).toEqual(raceGoals);
 const report=prevalidateGenerationScope(x.athleteData,{...x.planConfig,_outputFormat:'json'});
 expect(report.weeks).toHaveLength(12);
 const b=report.weeks[7];
 expect(b.layout?.requiredEvents).toEqual([{dayName:'samedi',sport:'run'}]);
 expect(b.layout?.days.find(d=>d.dayName==='samedi')?.slots).toContainEqual(expect.objectContaining({sport:'run',isRaceEvent:true}));
 const window=buildWindowRegenConfig({fromWeek:5,toWeek:8,currentPlan:{title:'Plan fictif sans sortie modèle',totalWeeks:12,weeks:[],phases:[]},athleteData:x.athleteData,baseConfig:x.planConfig}).config;
 expect(window.raceGoals).toEqual(raceGoals);
 expect(declaredRaceSlotsForWeek(window,4)).toEqual([{dayName:'samedi',sport:'run'}]);
 const local=prevalidateGenerationScope(x.athleteData,{...window,_outputFormat:'json'});
 expect(local.weeks[3].layout?.requiredEvents).toEqual([{dayName:'samedi',sport:'run'}]);
 const entry=prepareGenerationContracts(x.athleteData,window).weeklyQuotas[4];
 const transported=buildWeekQuotaTransport(4,entry,false,undefined,undefined,declaredRaceSlotsForWeek(window,4));
 expect(JSON.stringify(transported)).toContain('isRaceEvent');
});
it('a ceiling is not a prescription: recovery and return use the last actual load week and still reject excess',()=>{
 // Negative-control dose fragments only, not a generated or scientifically validated plan.
 const budget=(globalWeek:number)=>({globalWeek,maxMinutes:300,weeklyIncreasePctMax:.1,referenceSource:'internal-matrix' as const});
 const quotas={3:{weekType:'load',volumeBudget:budget(3)},4:{weekType:'recovery',volumeBudget:budget(4)},5:{weekType:'load',volumeBudget:budget(5)}};
 const week=(weekNumber:number,durationMin:number)=>({weekNumber,sessions:[{sport:'run',title:'Endurance fictive',durationMin,details:'',custom:true,isRest:false}]});
 const safe={weeks:[week(3,100),week(4,70),week(5,110)]} as FinalValidationPlanLike;
 expect(validateCoachVolumeBudgets(safe,quotas)).toEqual([]);
 const excessive={weeks:[week(3,100),week(4,71),week(5,121)]} as FinalValidationPlanLike;
 const issues=validateCoachVolumeBudgets(excessive,quotas);
 expect(issues.map(i=>i.week)).toEqual([4,5]);expect(issues.every(i=>i.severity==='error')).toBe(true);
});
