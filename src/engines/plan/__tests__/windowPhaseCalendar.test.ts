import {it,expect} from 'vitest';
import {buildWindowRegenConfig} from '../planWindowRegen';
import {buildPeriodizationCalendar} from '@/lib/plan/periodizationCalendar';
import {computeObjectiveCycleSegments} from '@/lib/plan/multiObjectiveClassification';
import {planningCases,preparePlanningCaseContext,supplementaryPlanningCases} from '@/qa/sports-plan-lab/planningMatrix';
it.each(['5K','10K','Semi','Marathon','TrailMountain','Sprint','Olympic','703','IM'] as const)('slices the existing full calendar for %s instead of flattening a mixed window',objective=>{
 const spec=planningCases().find(c=>c.objective===objective&&c.level==='light'&&c.ambition==='finisher'&&c.load==='unknown')!;
 const {prepared}=preparePlanningCaseContext(spec);const base=prepared.planConfig;
 const full=buildPeriodizationCalendar(base)!;const n=base.weeksAvailable!;
 const {config}=buildWindowRegenConfig({fromWeek:1,toWeek:n,currentPlan:{title:'Fixture',totalWeeks:n,weeks:[],phases:[]},athleteData:prepared.athleteData,baseConfig:base});
 expect(config.windowWeekPhases).toEqual(full);
 expect(buildPeriodizationCalendar(config)).toEqual(full);
 expect(config.identifiedLimitersRaw).toEqual(base.identifiedLimitersRaw);
 expect(config.deloadCadenceWeeks).toBe(base.deloadCadenceWeeks);
});
it('slices the LCW full calendar without imposing another discipline periodization',()=>{
 const spec=supplementaryPlanningCases().find(c=>c.format==='lcw_3day')!;
 const {prepared}=preparePlanningCaseContext(spec);const base=prepared.planConfig,n=base.weeksAvailable!;
 const full=buildPeriodizationCalendar(base)!;const from=Math.max(2,Math.floor(n/2));
 const {config}=buildWindowRegenConfig({fromWeek:from,toWeek:n,currentPlan:{title:'LCW',totalWeeks:n,weeks:[],phases:[]},athleteData:prepared.athleteData,baseConfig:base});
 expect(config.windowWeekPhases).toEqual(Object.fromEntries(Array.from({length:n-from+1},(_,i)=>[i+1,full[from+i]])));
 expect(buildPeriodizationCalendar(config)).toEqual(config.windowWeekPhases);
});
it('preserves the existing reduced foundation after an intermediate full peak',()=>{
 const spec=planningCases().find(c=>c.objective==='IM'&&c.level==='light'&&c.ambition==='finisher')!;
 const {prepared}=preparePlanningCaseContext(spec);const date=(week:number)=>new Date(Date.UTC(2026,9,26+week*7-1)).toISOString().slice(0,10);
 const base={...prepared.planConfig,weeksAvailable:40,planStartDate:'2026-10-26',raceGoals:[
  {objective:'Marathon',priority:'B' as const,raceDate:date(20)},
  {objective:'IM',priority:'A' as const,raceDate:date(40)}]};
 const cycles=computeObjectiveCycleSegments(base.raceGoals,base.planStartDate,40)!;
 expect(cycles).toHaveLength(2);
 const cycle=cycles[1],from=cycle.startWeek,to=cycle.startWeek+8,full=buildPeriodizationCalendar(base)!;
 const {config}=buildWindowRegenConfig({fromWeek:from,toWeek:to,cycle,currentPlan:{title:'Two peaks',totalWeeks:40,weeks:[],phases:[]},athleteData:prepared.athleteData,baseConfig:base});
 expect(config.windowWeekPhases).toEqual(Object.fromEntries(Array.from({length:to-from+1},(_,i)=>[i+1,full[from+i]])));
 expect(buildPeriodizationCalendar(config)).toEqual(config.windowWeekPhases);
 expect(Object.values(config.windowWeekPhases!).filter(p=>p==='base').length).toBeLessThan(base.fondationDurationWeeks!);
});
