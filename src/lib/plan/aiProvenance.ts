import { PLAN_PROVENANCE_SCHEMA } from './planProvenance';
/** Recorded at actual generation, never inferred when reopening an old plan. */
export function aiProvenance(inputs:unknown,config:unknown,release:unknown){
 const r=release as {components?:Record<string,unknown>;releaseId?:unknown}|null;
 const version=r?.components?.['ai-training-plan'];
 return {schema:PLAN_PROVENANCE_SCHEMA,engine:'ai',mode:'coach-inputs',engineVersion:typeof version==='string'?version:null,releaseId:typeof r?.releaseId==='string'?r.releaseId:null,inputParameters:structuredClone({inputs,config}),syntheticFixture:false,prescriptionAllowed:false,sportingAttestation:false,generatedAt:new Date().toISOString()};
}
