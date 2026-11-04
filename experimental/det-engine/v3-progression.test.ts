import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import type {V2Result} from './v2-engine';import {repairProgression} from './v3-progression';
import {assessRepairQuality,progressionExposure} from './v3-quality';import {noNewCritical} from './v2-validation';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('preserves explicit refusals and rejects an unbounded repair budget',()=>{
 const raw={candidate:undefined} as V2Result;expect(repairProgression(raw,{} as never,{} as never)).toEqual({result:raw,records:[]});
 expect(()=>repairProgression({candidate:{}} as V2Result,{} as never,{} as never,999)).toThrow('INVALID_PROGRESSION_BUDGET');
});
it('does not repair a real Sprint progression warning by padding an earlier endurance session',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const source=JSON.parse(gunzipSync(readFileSync('docs/det-engine/v2/final/candidate.json.gz')).toString()) as {rows:Array<V2Result&{id:string}>};
 const id='Sprint:untrained:finisher:known_synthetic',row=source.rows.find(r=>r.id===id)!;
 const spec=planningCases().find(c=>c.id===id)!,{prepared}=preparePlanningCaseContext(spec),before=structuredClone(row);
 const {result,records}=repairProgression(row,prepared.athleteData,prepared.planConfig);
 expect(row).toEqual(before);expect(records.every(r=>r.after<r.before)).toBe(true);
 const minutes=(r:V2Result)=>r.candidate!.weeks.reduce((n,w)=>n+w.sessions.reduce((m,s)=>m+(s.durationMin??0),0),0);
 expect(minutes(result)).toBeLessThanOrEqual(minutes(row));
 const early=row.candidate!.weeks[1].sessions.find(s=>s.catalogId==='A_RUN_Z2_EASY');
 expect(early?.durationMin).toBe(35);expect(result.candidate!.weeks[1].sessions.find(s=>s.catalogId==='A_RUN_Z2_EASY')?.durationMin).toBeLessThanOrEqual(35);
});
it.skipIf(!process.env.TFCL_DET_V3_PROGRESSION_OUT)('attempts bounded whole-plan progression correction and exact replay on all 600 cases',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const input=process.env.TFCL_DET_V3_INPUT??'/tmp/det-v3-quality/candidate.json.gz';
 const baseline=JSON.parse(gunzipSync(readFileSync(input)).toString()) as {version:string;controls:unknown[];rows:Array<V2Result&{id:string}>};
 const candidate=[],replayed=[],records=[],cases=[...planningCases(),...supplementaryPlanningCases()];
 for(const row of baseline.rows){
  if(!row.candidate){candidate.push(row);replayed.push(row);continue;}
  const spec=cases.find(c=>c.id===row.id)!,{prepared}=preparePlanningCaseContext(spec);
  const once=repairProgression(row,prepared.athleteData,prepared.planConfig),replay=repairProgression(row,prepared.athleteData,prepared.planConfig);
  expect(once).toEqual(replay);expect(noNewCritical(row.issues,once.result.issues)).toBe(true);
  expect(assessRepairQuality(row.issues,once.result.issues,row.candidate,once.result.candidate!).accepted).toBe(true);
  expect(once.records.every(r=>r.after<r.before)).toBe(true);
  records.push(...once.records.map(r=>({caseId:row.id,...r})));candidate.push({...row,...once.result});replayed.push({...row,...replay.result});
 }
 const out=process.env.TFCL_DET_V3_PROGRESSION_OUT!;mkdirSync(out,{recursive:true});
 const count=(rows:typeof candidate,code:string,severity:string)=>rows.reduce((n,r)=>n+r.issues.filter(i=>i.code===code&&i.severity===severity).length,0);
 writeFileSync(`${out}/summary.json`,JSON.stringify({version:'det-v3-progression-1',baseline:baseline.version,cases:candidate.length,attempts:records.length,accepted:records.filter(r=>r.accepted).length,
  progressionWarningsBefore:count(baseline.rows,'progression','warning'),progressionWarningsAfter:count(candidate,'progression','warning'),
  records,exposure:candidate.filter(r=>r.candidate).map(r=>({id:r.id,weeks:progressionExposure(r.candidate!)})),exactReplay:600},null,2));
 writeFileSync(`${out}/candidate.json.gz`,gzipSync(JSON.stringify({version:'det-v3-progression-1',controls:baseline.controls,rows:candidate})));writeFileSync(`${out}/replay.json.gz`,gzipSync(JSON.stringify({version:'det-v3-progression-1',controls:baseline.controls,rows:replayed})));expect(candidate).toHaveLength(600);expect(network).not.toHaveBeenCalled();
},900000);
