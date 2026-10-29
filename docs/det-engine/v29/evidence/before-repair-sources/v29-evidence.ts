import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {digest} from './v9-prospective';import {assertRecipeIntegrity} from './v18-compiler.mjs';

/** Offline registration boundary. The immutable V28 archives are checked before any caller-supplied claim. */
export function createEvidenceRegistryV29(registration:any,prepared:any[]){
 const archives:any={};for(const[k,p]of Object.entries(registration.sourceArtifacts)as any){const bytes=fs.readFileSync(p.path);if(createHash('sha256').update(bytes).digest('hex')!==p.sha256)throw Error('V29_REGISTERED_ARCHIVE_CHANGED:'+k);archives[k]=JSON.parse(zlib.gunzipSync(bytes).toString());}
 const rows=new Map<string,any>(archives.scenarios.map((x:any)=>[x.context.scenarioId,structuredClone(x)])),subject=archives.originals.find((x:any)=>x.caseId===registration.subjectCaseId),v=prepared.find((x:any)=>x.caseId===registration.subjectCaseId);
 if(!subject||!v||digest(subject.input)!==digest(v.input))throw Error('V29_REGISTERED_SUBJECT_NOT_REPRODUCED');
 const profileHash=digest(v.profile),inputHash=digest(subject.input);
 return{registration,originals:archives.originals,phases:archives.phases,
  scenarioIds:[...rows.keys()],get:(id:string)=>{const r=rows.get(id);if(!r)throw Error('V29_UNKNOWN_SCENARIO');return structuredClone(r);},
  binding:(id:string)=>({subjectCaseId:subject.caseId,subjectInputHash:inputHash,sourceRowHash:rows.has(id)?digest(rows.get(id)):null,sourceArtifact:registration.sourceArtifacts.scenarios}),
  verify:(f:any,execution:any,request:any)=>{
   const errors:string[]=[],r=rows.get(request.scenarioId);
   if(!r)return{valid:false,errors:['unregistered_scenario'],row:null};
   if(request.subjectCaseId!==subject.caseId||f.v.caseId!==subject.caseId||digest(f.v.input)!==inputHash||request.subjectInputHash!==inputHash||digest(f.v.profile)!==profileHash)errors.push('subject_input_or_profile_binding_mismatch');
   if(request.sourceRowHash!==digest(r)||digest(execution)!==digest(r.result))errors.push('registered_execution_or_parameter_claim_mismatch');
   const week=subject.result.calendar.weeks.find((w:any)=>w.week===f.week.week),slot=week?.slots.find((s:any)=>s.key===f.slot.key);
   if(!slot||digest(slot)!==digest(f.slot)||digest(week)!==digest(f.week)||r.sourceId!==f.slot.card.id)errors.push('registered_calendar_source_role_or_placement_mismatch');
   try{assertRecipeIntegrity(f.record.originalCanonical,f.record.sourceV18Recipe);}catch{errors.push('source_integrity_failed');}
   if(digest(f.record.originalCanonical)!==r.result.sourceHash||digest(f.record.sourceV18Recipe)!==r.result.sourceRecipeHash)errors.push('source_component_or_version_mismatch');
   if(request.semantics==='synthetic_upper_bound'){
    if(request.envelopeAcknowledged!==true||request.reservedMinutes!==r.fixture.availableMinutes||registration.syntheticOnly!==true)errors.push('unregistered_or_unacknowledged_synthetic_reservation');
   }else if(request.semantics==='legacy_exact'){if(request.reservedMinutes!==slot?.minutes)errors.push('legacy_duration_must_remain_exactly_native');}
   else errors.push('explicit_time_semantics_required');
   return{valid:errors.length===0,errors,row:structuredClone(r)};
  }};
}
