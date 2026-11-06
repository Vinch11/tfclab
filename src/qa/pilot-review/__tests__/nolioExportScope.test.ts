import {describe,it,expect,vi} from 'vitest';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import {selectExportScope} from '../../../../supabase/functions/_shared/nolioV2/exportScope';
import {operationKey} from '../../../../supabase/functions/_shared/nolioV2/marker';
import {sessionsFromPlanJson} from '../../../../supabase/functions/_shared/nolioV2/planSessions';
const workout={schema:'det-structured-workout-v1',sourceId:'V3P_BIKE_002',sport:'bike',chosenDurationMin:20,exactSeconds:1200,nodes:[{kind:'step',role:'main',label:'Pédalage facile',domain:'moderate_lt1',dose:{seconds:1200},target:{metric:'watts',min:100,max:150,source:'athlete_reference_with_doctrine_model',confidence:'model'}}]};
const session=(weekNumber:number,dayIndex:number)=>({weekNumber,dayIndex,title:'Endurance synthétique',sport:'bike',catalogId:'V3P_BIKE_002',durationMin:20,details:'Pédalage facile',detStructuredWorkout:workout});
const plan={_planStartDate:'2026-11-02',weeks:[{weekNumber:1,sessions:[session(1,1),session(1,4)]},{weekNumber:2,sessions:[session(2,1)]}],_provenance:{engine:'det',prescriptionAllowed:false}};
const refs={synthetic:true,athleteId:'usr_SYNTH1',sportIds:{bike:'spt_SYNTHBIKE'},exerciseIds:{},competition:null};
const id='22222222-2222-4222-8222-222222222222';
describe('Nolio scoped exports from the exact saved plan',()=>{
 it('filters before mapping but keeps full plan identity, dates, bodies and dedup keys',async()=>{
  const fetchSpy=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('No network');});
  try{
   const all=await preparePlan(plan,refs,id),week=await preparePlan(plan,refs,id,{kind:'weeks',from:2,to:2}),one=await preparePlan(plan,refs,id,{kind:'sessions',keys:['S2-J1-0']});
   expect(all.precheck.complete,JSON.stringify(all.precheck)).toBe(true);expect(all.ops).toHaveLength(3);
   expect(week.precheck.complete).toBe(true);expect(week.ops).toHaveLength(1);expect(one.ops).toHaveLength(1);
   expect(week.planSha256).toBe(all.planSha256);expect(one.planSha256).toBe(all.planSha256);
   expect(week.opsSha256).not.toBe(all.opsSha256);expect(one.opsSha256).toBe(week.opsSha256);
   expect(one.ops[0].date).toBe('2026-11-10');expect(one.ops[0].body).toEqual(all.ops[2].body);
   expect(await operationKey(id,one.ops[0].source)).toEqual(await operationKey(id,all.ops[2].source));
   expect(fetchSpy).not.toHaveBeenCalled();
  }finally{fetchSpy.mockRestore();}
 });
 it.each([{kind:'sessions',keys:['S9-J1-0']},{kind:'sessions',keys:['S1-J1-0','S1-J1-0']},{kind:'weeks',from:3,to:2},{kind:'all',body:{arbitrary:'workout'}},{kind:'weeks',from:1,to:105},{}])('refuses invalid scope without silently exporting everything: %j',async scope=>{
  const p=await preparePlan(plan,refs,id,scope);expect(p.precheck.complete).toBe(false);expect(p.ops).toEqual([]);expect(p.precheck.planProblems).toContain('export_scope_invalid');
 });
 it('retains the original extraction and refuses an isolated rest selection',()=>{
  const original=sessionsFromPlanJson(plan).sessions,before=structuredClone(original);
  expect(selectExportScope(original,{kind:'all'}).sessions).toEqual(original);
  expect(selectExportScope([{...original[0],isRest:true}],{kind:'sessions',keys:['S1-J1-0']}).problems).toEqual(['export_scope_invalid']);
  expect(original).toEqual(before);
 });
});
