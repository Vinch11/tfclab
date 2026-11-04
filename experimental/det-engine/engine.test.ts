import {it,expect,vi,afterEach} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {constructDeterministicPlan} from './engine';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
function offline(){
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 return vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
}
it('refuses zero resources without preparing a plan',()=>{
 const fetch=offline();const {prepared}=preparePlanningCaseContext(planningCases()[0]);
 expect(constructDeterministicPlan(prepared.athleteData,prepared.planConfig,{maxNodes:0,maxMilliseconds:100}).reason).toBe('invalid_search_budget');
 expect(fetch).not.toHaveBeenCalled();
});
it('runs a complete deterministic search twice with identical sporting output',()=>{
 const fetch=offline();const spec=planningCases().find(c=>c.objective==='10K'&&c.level==='light'&&c.ambition==='finisher'&&c.load==='unknown')!;
 const {prepared}=preparePlanningCaseContext({...spec,constraints:'unrestricted',intermediate:false});
 const a=constructDeterministicPlan(prepared.athleteData,prepared.planConfig);
 const b=constructDeterministicPlan(prepared.athleteData,prepared.planConfig);
 expect(a).toEqual(b);expect(fetch).not.toHaveBeenCalled();
 expect(a.sportingRelevance).toBe('not_attested');
 expect(a.technicallyConstructed).toBe(true);
 expect(a.candidate!.weeks).toHaveLength(prepared.planConfig.weeksAvailable!);
});
it('reuses the real StartToRun template without generating catalogue cards',()=>{
 const fetch=offline();const {prepared}=preparePlanningCaseContext(planningCases().find(c=>c.objective==='StartToRun')!);
 const result=constructDeterministicPlan(prepared.athleteData,{...prepared.planConfig,constraints:undefined,raceGoals:[]});
 expect(result.technicallyConstructed).toBe(true);expect(result.candidate!.weeks).toHaveLength(12);
 expect(result.candidate!.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest).every(s=>!!s.catalogId)).toBe(true);
 expect(fetch).not.toHaveBeenCalled();
});
it('refuses a real search when its node budget is exhausted',()=>{
 const fetch=offline();const spec=planningCases().find(c=>c.objective==='10K'&&c.level==='light'&&c.ambition==='finisher'&&c.load==='unknown')!;
 const {prepared}=preparePlanningCaseContext({...spec,constraints:'unrestricted',intermediate:false});
 const result=constructDeterministicPlan(prepared.athleteData,prepared.planConfig,{maxNodes:1,maxMilliseconds:5000});
 expect(result.reason).toBe('search_budget_exhausted');expect(result.technicallyConstructed).toBe(false);
 expect(fetch).not.toHaveBeenCalled();
});
it.skipIf(!process.env.TFCL_DET_MATRIX_OUT)('measures all 600 actual configurations; refuses unsupported contracts honestly',()=>{
 const fetch=offline();vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const cases=[...planningCases(),...supplementaryPlanningCases()];expect(cases).toHaveLength(600);
 const rows=cases.map(spec=>{
  const {prepared}=preparePlanningCaseContext(spec);
  const result=constructDeterministicPlan(prepared.athleteData,prepared.planConfig,{maxNodes:5000,maxMilliseconds:3000});
  return {id:spec.id,objective:spec.objective,ambition:spec.ambition,level:spec.level,format:spec.format??'continuous',...result};
 });
 const out=process.env.TFCL_DET_MATRIX_OUT!;mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/matrix.json`,JSON.stringify(rows,null,2));
 const groups=[...new Set(rows.map(r=>`${r.objective}:${r.ambition}:${r.format}`))].map(key=>{
  const group=rows.filter(r=>`${r.objective}:${r.ambition}:${r.format}`===key);
  return {key,cases:group.length,constructed:group.filter(r=>r.technicallyConstructed).length,conformant:group.filter(r=>r.constraintsSatisfied).length,refusals:group.filter(r=>r.status==='refused').map(r=>r.reason)};
 });
 writeFileSync(`${out}/summary.json`,JSON.stringify({cases:rows.length,groups},null,2));
 for(const row of rows){
  expect(row.humanReviewRequired).toBe(true);
  if(row.technicallyConstructed)expect(row.candidate?.weeks.length).toBeGreaterThan(0);
  if(row.status==='refused')expect(row.reason).toBeTruthy();
 }
 expect(fetch).not.toHaveBeenCalled();
},1800000);
