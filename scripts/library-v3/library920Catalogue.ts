/** All 920 source IDs registered, without altering the historical 800 cohort.
 * Ordinary candidates can enter a review proposal. Special records retain
 * their typed route; protocols/rest never become exercise minutes. */
import candidateText from './library920Candidates.json?raw';
import manifestText from './library920Manifest.json?raw';
import specialText from './library920SpecialRecords.json?raw';
import registryText from './library920EngineeringRegistry.json?raw';
import { auditV3Catalogue, type V3Catalogue, type V3Workout } from './catalogueRuntime';
import { auditV3SportingRegistry, fingerprintV3SportingSource, type V3SportingSourceRecord } from './sportingQualification800';
interface SourceMetadata {sourceId:string;runtimeId:string|null;sourcePages:number[];goals:string[];sourceGoalsText:string|null;
 recordType:string;terrainEffortRequired:boolean;techniqueSpecificSwimPaceRequired:boolean;metadata:Record<string,unknown>}
const manifest=JSON.parse(manifestText) as {version:string;sourceSha256:string;candidateFileSha256:string;total:number;ordinary:number;special:number;records:SourceMetadata[]};
const special=JSON.parse(specialText) as {count:number;records:Array<{sourceId:string;recordType:string;metadata:Record<string,unknown>;prescription:Record<string,unknown>&{automaticSelection:false}}>};
const registry=JSON.parse(registryText) as {records:V3SportingSourceRecord[]};
// Raw text imports keep the large authoring files out of TypeScript's inferred
// literal unions. The complete runtime and sporting audits still run below.
export const library920Catalogue=JSON.parse(candidateText) as V3Catalogue;
export const library920Manifest=manifest;
export const library920SpecialRecords=special.records;
export const library920EngineeringRecords=registry.records as V3SportingSourceRecord[];
const byId=new Map(library920Catalogue.workouts.map(w=>[w.id,w]));
const records=new Map(manifest.records.filter(r=>r.runtimeId).map(r=>[r.runtimeId,r]));
const decisions=new Map(library920EngineeringRecords.map(r=>[r.id,r]));
export const findLibrary920Source=(id:string)=>byId.get(id);
export const library920SourceMetadata=(id:string)=>records.get(id);
export function library920Problems():string[]{
 const errors=[...auditV3Catalogue(library920Catalogue),...auditV3SportingRegistry(library920Catalogue.workouts,library920EngineeringRecords,826)];
 if(manifest.total!==920||records.size!==826||special.records.length!==94||
 new Set(manifest.records.map(r=>r.sourceId)).size!==920)errors.push('library920_source_coverage_invalid');
 for(const w of library920Catalogue.workouts)if(!records.has(w.id))errors.push('library920_missing_original_id:'+w.id);
 return errors;
}
/** Engineering eligibility is explicit; unknown equipment or source blockers
 * cannot be cleared by a good limiter score. No athlete permission is issued. */
export function library920EngineeringEligible(w:V3Workout):boolean{
 const r=decisions.get(w.id);
 return !!r&&r.sourceStatus==='source_prequalified_pending_individual_review'&&
 r.sourceBlockers.length===0&&r.sourceFingerprint===fingerprintV3SportingSource(w);
}
export const library920CandidatesForProposal=()=>library920Catalogue.workouts.filter(library920EngineeringEligible);
/** Machine-readable disposition for EVERY original record. A registered
 * protocol or a blocked source is never an ordinary selectable workout. */
export function library920RecordStatus(id:string){
 const m=records.get(id)??manifest.records.find(r=>r.sourceId===id);
 if(!m)return null;
 const decision=m.runtimeId?decisions.get(m.runtimeId):undefined;
 return {sourceId:m.sourceId,runtimeId:m.runtimeId,recordType:m.recordType,
  status:!m.runtimeId?'special_route_required':decision?.sourceStatus==='source_prequalified_pending_individual_review'?'candidate_for_plan_review':'blocked_source_review',
  blockingReasons:decision?.sourceBlockers??[],
  prescriptionAllowed:false as const,scientificSessionValidated:false as const,athleteReviewRequired:true as const};
}
