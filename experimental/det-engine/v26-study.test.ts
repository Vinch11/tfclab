import fs from 'node:fs';import zlib from 'node:zlib';import {it,expect,vi} from 'vitest';
import {loadV26Data,sensitivityV26} from './v26-test-data';
import {buildV26Prescription} from './v26-prescription';
import {renderV26Session,simulateV26Nolio} from './v26-output';
import {consumeRunCostV26} from './v26-physiology';
import {digest} from './v9-prospective';

/** References are already immutable archives: avoid duplicating all earlier trial calendars in each V26 artifact. */
function evidenceView(r:any){const {v25Reference,floor,...rest}=r;const {baselineV25,alternative,...floorMeta}=floor;return{...rest,floor:{...floorMeta,alternativePresent:!!alternative},beforeArtifact:'docs/det-engine/v25-coach-floor/evidence/validation-1/build/results.json.gz',beforeArtifactCase:r.caseId,baselineV25ReferenceRetainedInOriginalArchive:true};}

it('builds eight unchanged references, ten preregistered sensitivity decisions and complete coach dossiers',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const d=loadV26Data(),out=process.env.TFCL_DET_V26_OUT;
 if(out){if(fs.existsSync(out)||!out.startsWith('docs/det-engine/v26/evidence/'))throw Error('FRESH_V26_OUTPUT_REQUIRED');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/preregistered-inputs.json',JSON.stringify(d.v26,null,2)+'\n');fs.writeFileSync(out+'/original-cases.json',JSON.stringify(d.cases,null,2)+'\n');}
 const originals=d.prepared.map((v:any,i:number)=>{const r=buildV26Prescription(v,d.a,d.canonical,d.knowledge,d.spec.clock);expect(r.v25Reference).toEqual(d.previous[i].optIn.baselineV25);expect(r.floor).toEqual(d.previous[i].optIn);return r;});
 const sensitivity=d.v26.sensitivity.map((test:any)=>{const {v,spec,knowledge}=sensitivityV26(d,test);return{id:test.id,delta:test.delta,result:buildV26Prescription(v,spec,d.canonical,knowledge,d.spec.clock)};});
 const a=sensitivity[0].result,b=sensitivity[1].result,c=sensitivity[2].result;
 const reduced=sensitivity[4].result;
 expect(reduced.floor.complementary.policyApplied).toBe(false);
 expect(digest(reduced.retained),'a refused alternative must remain separate from the retained native calendar').toBe(digest(reduced.v25Reference.baselineV24.result));
 expect(a.search.results.find((r:any)=>r.intention.lever.id==='vo2_intervals').offers.some((o:any)=>o.sourceId==='B_BIKE_VO2_3MIN'&&o.layers.A_technicallyStructured)).toBe(true);
 const bFoundation=b.search.results.find((r:any)=>r.intention.lever.id==='z2_volume');
 expect(bFoundation.shortlistForEvidenceReview).toContain('SEILER_BIKE_Z1_LONG@original');
 expect(bFoundation.selectedForCoachReview).toEqual([]);
 expect(bFoundation.offers[0].blockers).toContain('unconfirmed_prerequisite:ventilateur');
 expect(c.search.results.every((r:any)=>r.selectedForCoachReview.length===0)).toBe(true);
 expect(a.retained.decisions.filter((s:any)=>s.sport==='run'&&s.state==='not_admissible')).toHaveLength(7);
 expect(sensitivity[8].result.search.results.find((r:any)=>r.intention.lever.id==='z2_volume').selectedForCoachReview).toEqual([]);
 expect(sensitivity[9].result.retained).toEqual(b.retained);
 const dossiers=originals.slice(0,2).map(r=>({caseId:r.caseId,weeks:r.retained.calendar.weeks.map((w:any)=>({week:w.week,phase:w.phase,type:w.type,budget:w.budget,reservedMinutes:w.reservedMinutes,days:w.days,sessions:w.slots.map((s:any)=>renderV26Session(s,r.retained.decisions.find((x:any)=>x.slotKey===s.key),d.canonical.get(s.card.id),r.bindings.filter((b:any)=>b.actualMatchedSlots.some((x:any)=>x.slotKey===s.key))))})),nul:null}));
 const nolio=originals.slice(0,2).map(r=>({caseId:r.caseId,result:simulateV26Nolio(r,d.canonical)}));
 const f=d.fixtures.physiology[0],context={simulation:true,verifiedArtifacts:d.fixtures.verifiedArtifacts,expectedRawHash:digest(f.raw)},meta={discipline:'run',qualification:'documented_synthetic_contract',rawInputHash:digest(f.raw)};
 const transfers=d.v26.transferCases.map((id:string)=>{const provenance={...meta},envelope=structuredClone(f.envelope);if(id==='uncertain')envelope.status='uncertain';if(id==='absent'){envelope.status='absent';envelope.value=null;}if(id==='unknown_discipline')provenance.discipline='unknown';if(id==='historical_unattested')provenance.qualification='unknown_historical_C8';return{id,fixtureScope:'separate unchanged V25/#424 contract probe, never profile A/B/C evidence',result:consumeRunCostV26(envelope,f.raw,null,d.spec.clock,context,provenance)};});
 expect(transfers.filter((x:any)=>x.result.result.status==='typed_context_consumed_for_review').map((x:any)=>x.id)).toEqual(['typed_verified']);
 if(out){for(const[name,data]of Object.entries({originals:originals.map(evidenceView),sensitivity:sensitivity.map((s:any)=>({...s,result:evidenceView(s.result)})),dossiers,nolio,transfers}))fs.writeFileSync(out+'/'+name+'.json.gz',zlib.gzipSync(JSON.stringify(data,null,2)));}
 }finally{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();}
});
