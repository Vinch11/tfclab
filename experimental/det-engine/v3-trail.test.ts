import {it,expect,vi,afterEach} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';import {gzipSync} from 'node:zlib';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {buildTrailPrescriptionEnvelope,TRAIL_MODELS} from './v3-trail';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('refuses invalid or missing geometry without adopting road defaults',()=>{
 for(const event of [{distanceKm:null,elevationGainM:null},{distanceKm:NaN,elevationGainM:100},{distanceKm:20,elevationGainM:-1}]){
  const result=buildTrailPrescriptionEnvelope({} as never,{objective:'TrailShort',weeksAvailable:8},event,'catalogue_evidence_only');
  expect(result.status).toBe('refused');expect(result.technicallyConstructed).toBe(false);
 }
});
it.skipIf(!process.env.TFCL_DET_V3_TRAIL_OUT)('compares dedicated trail envelopes on real matrix inputs and explicit synthetic geometries',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const original=[],extended=[];
 for(const spec of planningCases().filter(c=>/Trail/.test(c.objective))){
  const {prepared}=preparePlanningCaseContext(spec),goal=prepared.planConfig.raceGoals?.find(g=>g.priority==='A');
  const envelope=buildTrailPrescriptionEnvelope(prepared.athleteData,prepared.planConfig,{distanceKm:goal?.distanceKm??null,elevationGainM:goal?.elevationGainM??null},'catalogue_evidence_only');
  expect(envelope.status).toBe('refused');original.push({id:spec.id,status:envelope.status,reason:envelope.status==='refused'?envelope.reason:null});
 }
 // Explicit synthetic event fixtures, not inferred missing values for the original 160 cases.
 for(const objective of ['TrailShort','TrailMountain','TrailUltra'])for(const level of ['untrained','light','trained','highly_trained']){
  const spec=planningCases().find(c=>c.objective===objective&&c.level===level)!;expect(spec).toBeDefined();
  const {prepared}=preparePlanningCaseContext(spec);
  const event=objective==='TrailShort'?{distanceKm:25,elevationGainM:800,elevationLossM:null}:objective==='TrailMountain'?{distanceKm:55,elevationGainM:3000,elevationLossM:2800}:{distanceKm:100,elevationGainM:6000,elevationLossM:6100};
  for(const model of TRAIL_MODELS){
   const candidate=buildTrailPrescriptionEnvelope(prepared.athleteData,prepared.planConfig,event,model);
   const replay=buildTrailPrescriptionEnvelope(prepared.athleteData,prepared.planConfig,event,model);expect(candidate).toEqual(replay);
   expect(candidate.status).toBe('envelope_only');expect(candidate.technicallyConstructed).toBe(false);
   if(candidate.status==='envelope_only'){
    expect(candidate.weeks).toHaveLength(prepared.planConfig.weeksAvailable!);
    expect(candidate.weeks.flatMap(w=>w.catalogue).every(c=>c.dMinusTargetM===null)).toBe(true);
   }
   extended.push({id:`synthetic:${objective}:${level}:${model}`,objective,level,model,source:'explicit_synthetic_event_fixture',...candidate});
  }
 }
 const out=process.env.TFCL_DET_V3_TRAIL_OUT!;mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/summary.json`,JSON.stringify({version:'det-v3-trail-1',originalCases:original.length,original,
  syntheticEnvelopes:extended.length,completePlans:0,exactReplay:extended.length,
  models:TRAIL_MODELS.map(model=>({model,envelopes:extended.filter(e=>e.model===model).length,
   weeks:extended.filter(e=>e.model===model).reduce((n,e)=>n+(e.weeks?.length??0),0),
   excludedFastDescentCards:extended.filter(e=>e.model===model).reduce((n,e)=>n+(e.weeks?.flatMap(w=>w.catalogue).filter(c=>c.exclusion==='eccentric_habituation_unknown').length??0),0)})),paidApiCalls:0},null,2));
 writeFileSync(`${out}/envelopes.json.gz`,gzipSync(JSON.stringify(extended)));expect(original).toHaveLength(160);expect(extended).toHaveLength(36);expect(network).not.toHaveBeenCalled();
},900000);
