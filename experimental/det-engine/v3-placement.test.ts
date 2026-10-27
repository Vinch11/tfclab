import {it,expect,vi,afterEach} from 'vitest';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import type {V2Result} from './v2-engine';import {repairPlacement} from './v3-placement';import {assessRepairQuality} from './v3-quality';import {noNewCritical,criticalCounts} from './v2-validation';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('preserves explicit refusals and rejects an unbounded relocation budget',()=>{
 const raw={candidate:undefined} as V2Result;expect(repairPlacement(raw,{} as never,{} as never)).toEqual({result:raw,records:[]});
 expect(()=>repairPlacement({candidate:{}} as V2Result,{} as never,{} as never,999)).toThrow('INVALID_PLACEMENT_BUDGET');
});
it.skipIf(!process.env.TFCL_DET_V3_PLACEMENT_OUT)('reorganizes actual weeks without changing doses, disciplines, events or objective; replay all cases',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const baseline=JSON.parse(gunzipSync(readFileSync(process.env.TFCL_DET_V3_INPUT!)).toString()) as {version:string;controls:unknown[];rows:Array<V2Result&{id:string}>};
 const rows=[],replayed=[],records=[],cases=[...planningCases(),...supplementaryPlanningCases()];
 for(const row of baseline.rows){
  if(!row.candidate){rows.push(row);replayed.push(row);continue;}
  const spec=cases.find(c=>c.id===row.id)!,{prepared}=preparePlanningCaseContext(spec),before=structuredClone(row);
  const once=repairPlacement(row,prepared.athleteData,prepared.planConfig),replay=repairPlacement(row,prepared.athleteData,prepared.planConfig);
  expect(row).toEqual(before);expect(once).toEqual(replay);expect(noNewCritical(row.issues,once.result.issues)).toBe(true);
  expect(assessRepairQuality(row.issues,once.result.issues,row.candidate,once.result.candidate!).accepted).toBe(true);
  const content=(r:V2Result)=>r.candidate!.weeks.map(w=>w.sessions.map(({dayIndex:_day,dayName:_name,...s})=>JSON.stringify(s)).sort());expect(content(once.result)).toEqual(content(row));
  rows.push({...row,...once.result});replayed.push({...row,...replay.result});records.push(...once.records.map(r=>({caseId:row.id,...r})));
 }
 const out=process.env.TFCL_DET_V3_PLACEMENT_OUT!,version=`${baseline.version}-placement`;mkdirSync(out,{recursive:true});
 const critical=(rows:typeof baseline.rows)=>rows.filter(r=>r.candidate).reduce((n,r)=>n+Object.values(criticalCounts(r.issues)).reduce((a,b)=>a+b,0),0);
 writeFileSync(`${out}/summary.json`,JSON.stringify({version,baseline:baseline.version,cases:rows.length,attempts:records.length,accepted:records.filter(r=>r.accepted).length,criticalBefore:critical(baseline.rows),criticalAfter:critical(rows),records,exactReplay:600},null,2));
 for(const [name,result] of [['candidate',rows],['replay',replayed]] as const)writeFileSync(`${out}/${name}.json.gz`,gzipSync(JSON.stringify({version,controls:baseline.controls,rows:result})));
 expect(rows).toHaveLength(600);expect(network).not.toHaveBeenCalled();
},900000);
