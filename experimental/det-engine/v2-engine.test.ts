import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {contextualizeResult,repairDeterministicCandidate} from './v2-engine';
import {noNewCritical,criticalCounts} from './v2-validation';
import type {EngineResult} from './engine';
const rows=JSON.parse(gunzipSync(readFileSync('docs/det-engine/evidence-final/matrix.json.gz')).toString()) as Array<EngineResult&{id:string}>;
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('rejects additional instances of an already present critical error',()=>{
 const issue={code:'polarization',week:2,severity:'error'};
 expect(noNewCritical([issue],[issue,issue])).toBe(false);
 expect(noNewCritical([issue],[{...issue,week:3}])).toBe(false);
 expect(noNewCritical([issue],[])).toBe(true);
});
it.each(['10K:light:finisher:unknown','Semi:light:finisher:unknown','Sprint:untrained:finisher:known_synthetic','703:untrained:age_group:known_synthetic'])(
 'repairs real catalogue candidates reversibly with complete validation: %s',id=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const spec=planningCases().find(c=>c.id===id)!,{prepared}=preparePlanningCaseContext(spec),raw=rows.find(r=>r.id===id)!;
 const base=contextualizeResult(raw,prepared.athleteData,prepared.planConfig),saved=structuredClone(base);
 const repaired=repairDeterministicCandidate(base,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4});
 const replay=repairDeterministicCandidate(base,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4});
 expect(base).toEqual(saved);expect(repaired).toEqual(replay);expect(repaired.repairs.length).toBeLessThanOrEqual(16);
 expect(noNewCritical(base.issues,repaired.issues)).toBe(true);
 expect(Object.values(criticalCounts(repaired.issues)).reduce((n,c)=>n+c,0)).toBeLessThanOrEqual(Object.values(criticalCounts(base.issues)).reduce((n,c)=>n+c,0));
 expect(network).not.toHaveBeenCalled();
 if(repaired.candidate)expect(repaired.candidate.phases.length).toBeGreaterThan(0);
},60000);
