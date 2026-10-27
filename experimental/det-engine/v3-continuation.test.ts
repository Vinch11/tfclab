import {it,expect,vi,afterEach} from 'vitest';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {repairDeterministicCandidate,type V2Result} from './v2-engine';import {assessRepairQuality} from './v3-quality';import {noNewCritical,criticalCounts} from './v2-validation';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V3_CONTINUE_OUT)('continues strict repairs from the last accepted candidate with independent replay',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const baseline=JSON.parse(gunzipSync(readFileSync(process.env.TFCL_DET_V3_INPUT!)).toString()) as {version:string;controls:unknown[];rows:Array<V2Result&{id:string}>};
 const rows=[],replayed=[],cases=[...planningCases(),...supplementaryPlanningCases()];let accepted=0,attempts=0;
 for(const row of baseline.rows){
  if(!row.candidate){rows.push(row);replayed.push(row);continue;}
  const spec=cases.find(c=>c.id===row.id)!,{prepared}=preparePlanningCaseContext(spec);
  const once=repairDeterministicCandidate(row,prepared.athleteData,prepared.planConfig,{maxAttempts:24,maxAccepted:4},assessRepairQuality);
  const replay=repairDeterministicCandidate(row,prepared.athleteData,prepared.planConfig,{maxAttempts:24,maxAccepted:4},assessRepairQuality);
  expect(once).toEqual(replay);expect(noNewCritical(row.issues,once.issues)).toBe(true);
  expect(assessRepairQuality(row.issues,once.issues,row.candidate,once.candidate!).accepted).toBe(true);
  if(row.constraintsSatisfied)expect(once.constraintsSatisfied).toBe(true);
  const changes=once.repairs.slice(row.repairs.length);accepted+=changes.filter(r=>r.accepted).length;attempts+=changes.length;
  rows.push({...row,...once});replayed.push({...row,...replay});
 }
 const out=process.env.TFCL_DET_V3_CONTINUE_OUT!,version=`${baseline.version}-strict-next`;mkdirSync(out,{recursive:true});
 const critical=(rows:typeof baseline.rows)=>rows.filter(r=>r.candidate).reduce((n,r)=>n+Object.values(criticalCounts(r.issues)).reduce((a,b)=>a+b,0),0);
 writeFileSync(`${out}/summary.json`,JSON.stringify({version,baseline:baseline.version,cases:rows.length,accepted,attempts,criticalBefore:critical(baseline.rows),criticalAfter:critical(rows),exactReplay:600},null,2));
 for(const [name,result] of [['candidate',rows],['replay',replayed]] as const)writeFileSync(`${out}/${name}.json.gz`,gzipSync(JSON.stringify({version,controls:baseline.controls,rows:result})));
 expect(rows).toHaveLength(600);expect(network).not.toHaveBeenCalled();
},900000);
