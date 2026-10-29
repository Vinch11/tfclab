import {consumeRunCostV25} from './v25-physiology';
/** Candidate #425 admission preflight; no #425 code imported, no native reference overwritten. */
export function consumeRunCostV26(envelope:any,raw:any,native:any,clock:string,context:any,provenance:any){
 const reasons:string[]=[];
 if(provenance?.discipline!=='run')reasons.push('explicit_run_provenance_required');
 if(provenance?.qualification!=='documented_synthetic_contract')reasons.push('historical_confidence_not_attested_C8');
 if(provenance?.rawInputHash!==context.expectedRawHash)reasons.push('subject_and_raw_source_binding_required');
 if(envelope?.value!=null&&(!(envelope.value>=150)||!(envelope.value<=280)))reasons.push('source_contract_oxygen_cost_domain');
 const nativeResult=consumeRunCostV25(reasons.length?null:envelope,raw,native,clock,context);
 return{version:'det-v26-425-preflight-1',preflightReasons:reasons,result:nativeResult,referenceInjectedIntoProfiles:false,source425AssumedMerged:false,C8Resolved:false,realSupabasePersistenceProven:false,individualDoseApproved:false};
}
