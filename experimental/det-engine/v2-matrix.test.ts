import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {contextualizeResult,repairDeterministicCandidate} from './v2-engine';
import {V2_CONTROLS,noNewCritical} from './v2-validation';
import type {EngineResult} from './engine';
const historical=JSON.parse(gunzipSync(readFileSync('docs/det-engine/evidence-final/matrix.json.gz')).toString()) as Array<EngineResult&{id:string}>;
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V2_OUT)('V2 measures the same 600 cases, complete validation context and exact repair replay',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const baseline=[],candidate=[],replay=[];
 const cases=[...planningCases(),...supplementaryPlanningCases()];expect(cases).toHaveLength(600);
 for(const spec of cases){
  const {prepared}=preparePlanningCaseContext(spec),raw=historical.find(r=>r.id===spec.id)!;
  const base=contextualizeResult(raw,prepared.athleteData,prepared.planConfig);
  const next=repairDeterministicCandidate(base,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4});
  const again=repairDeterministicCandidate(base,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4});
  const row=(result:typeof base)=>({id:spec.id,objective:spec.objective,ambition:spec.ambition,level:spec.level,format:spec.format??'continuous',
   physiology:spec.physiology,duration:spec.duration,load:spec.load,constraints:spec.constraints,...result,executedControls:result.coverage.executedControls});
  baseline.push(row(base));candidate.push(row(next));replay.push(row(again));
  expect(next,spec.id).toEqual(again);
  expect(noNewCritical(base.issues,next.issues),spec.id).toBe(true);
  expect(next.technicallyConstructed,spec.id).toBe(base.technicallyConstructed);
  if(base.constraintsSatisfied)expect(next.constraintsSatisfied,spec.id).toBe(true);
 }
 const dir=process.env.TFCL_DET_V2_OUT!;mkdirSync(dir,{recursive:true});
 for(const [name,rows] of [['baseline',baseline],['candidate',candidate],['replay',replay]] as const)
  writeFileSync(`${dir}/${name}.json`,JSON.stringify({version:`det-v2-${name==='baseline'?'context-baseline':'repair-1'}`,controls:V2_CONTROLS,rows}));
 expect(network).not.toHaveBeenCalled();
},1800000);
