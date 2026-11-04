import {assertRecipeIntegrity} from './v18-compiler.mjs';
import {digest} from './v9-prospective';

export interface ParameterV28 {
 key:string;value:any;unit:string;status:'known'|'unknown'|'proposed'|'authorized';
 origin:'synthetic_fixture'|'coach_decision'|'individual_observation';
 sourceId:string;sourceHash:string;recipeHash:string;
 scope:{scenarioId:string;objective:string;phase:string};contextDate:string;contextVersion:string;
 decisionRef?:string;effects:string[];rerunChecks:string[];
}
export interface ContextV28 {scenarioId:string;objective:string;phase:string;contextDate:string;contextVersion:string;syntheticOnly:boolean;}

/** This boundary records declarations. It cannot authenticate a coach or approve an individual dose. */
export function parameterSetV28(record:any,context:ContextV28,parameters:ParameterV28[],decisions:any[]=[],verifyDecision?:(record:any)=>boolean){
 const errors:string[]=[],unknowns:string[]=[],values=new Map<string,ParameterV28>();
 try{assertRecipeIntegrity(record.originalCanonical,record.sourceV18Recipe);}catch{errors.push('source_integrity_failed');}
 if(record.sourceCanonicalHash!==digest(record.originalCanonical)||record.sourceRecipeHash!==digest(record.sourceV18Recipe))errors.push('source_integrity_failed');
 if(!context.scenarioId||!context.objective||!context.phase||!/^\d{4}-\d{2}-\d{2}$/.test(context.contextDate)||!context.contextVersion)errors.push('invalid_parameter_context');
 if(!Array.isArray(parameters))errors.push('parameters_array_required');
 for(const p of Array.isArray(parameters)?parameters:[]){
  if(!p||typeof p.key!=='string'||!p.key||!['known','unknown','proposed','authorized'].includes(p.status)||!['synthetic_fixture','coach_decision','individual_observation'].includes(p.origin)||!p.scope||typeof p.unit!=='string'){
   errors.push('invalid_parameter_schema');continue;
  }
  if(values.has(p.key)){errors.push('duplicate_parameter:'+p.key);continue;}
  const scope=p.sourceId===record.legacyId&&p.sourceHash===record.sourceCanonicalHash&&p.recipeHash===record.sourceRecipeHash&&p.scope.scenarioId===context.scenarioId&&p.scope.objective===context.objective&&p.scope.phase===context.phase&&p.contextDate===context.contextDate&&p.contextVersion===context.contextVersion;
  if(!scope){errors.push('parameter_scope_or_source_mismatch:'+p.key);continue;}
  if(!Array.isArray(p.effects)||!p.effects.length||!p.effects.every((v:any)=>typeof v==='string')||!Array.isArray(p.rerunChecks)||!p.rerunChecks.length||!p.rerunChecks.every((v:any)=>typeof v==='string')){errors.push('parameter_impact_metadata_missing:'+p.key);continue;}
  if(p.status==='unknown'||p.status==='proposed'){unknowns.push('parameter_'+p.status+':'+p.key);continue;}
  if(p.origin==='synthetic_fixture'&&(!context.syntheticOnly||p.status!=='known')){errors.push('synthetic_parameter_cannot_be_individual_or_authorized:'+p.key);continue;}
  if(p.status==='authorized'||p.origin==='coach_decision'){
   const d=decisions.find(d=>d.decisionRef===p.decisionRef&&d.origin==='documented_explicit_coach_instruction'&&d.sourceArtifact&&d.authorizationScope==='technical_editorial_only'&&d.parameterHash===digest(p)&&d.individualDoseApproved===false);
   if(context.syntheticOnly||!d||!verifyDecision||!verifyDecision(d)){errors.push('explicit_coach_decision_not_supplied_or_authenticated:'+p.key);continue;}
  }
  values.set(p.key,p);
 }
 function get(key:string,unit:string,validate:(v:any)=>boolean){const p=values.get(key);if(!p){unknowns.push('required_parameter_missing:'+key);return undefined;}if(p.unit!==unit||!validate(p.value)){errors.push('invalid_parameter_value_or_unit:'+key);return undefined;}return p.value;}
 return{errors,unknowns,values,get,sourceId:record.legacyId,sourceHash:record.sourceCanonicalHash,sourceRecipeHash:record.sourceRecipeHash,context,
  originalText:record.originalCanonical.original.raw.structure,canonicalStructure:record.originalCanonical.original.effective.structure,parameters,individualEvidenceNotEstablished:true};
}
export function declareSyntheticV28(record:any,context:ContextV28,key:string,value:any,unit:string):ParameterV28{return{key,value,unit,status:value==null?'unknown':'known',origin:'synthetic_fixture',sourceId:record.legacyId,sourceHash:record.sourceCanonicalHash,recipeHash:record.sourceRecipeHash,scope:{scenarioId:context.scenarioId,objective:context.objective,phase:context.phase},contextDate:context.contextDate,contextVersion:context.contextVersion,effects:['execution structure and/or duration; not an acquired capacity'],rerunChecks:['source_integrity','structure','variant','phase','duration','intensity','logistics','capacity','restrictions','whole_microcycle']};}
