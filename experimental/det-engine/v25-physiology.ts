import{predictRunMLSSPctFromVLaCE,crossValidateRunMLSS}from'@/lib/v2/runMLSSPredictor';import{digest}from'./v9-prospective';
export interface RunCostTransferV25{
 version:'det-v25-run-cost-1';status:'documented_candidate'|'uncertain'|'absent';quantity:'running_oxygen_cost'|'run_economy_score';unit:'ml_O2/kg/km'|'score_0_100';value:number|null;
 sourceRef:string;sourceArtifactHash:string;rawInputHash:string;observedAt:string;validThrough:string;synthetic:boolean;
 uncertainty:{status:'documented'|'unknown';basis:string;individualErrorBound:number|null};method:{kind:'measured'|'estimated'|'synthetic_fixture';id:string;admissibility:'documented_context'|'experimental_context_only'|'unverified'};
}
export interface VerifiedCostArtifactV25{sourceRef:string;claims:Array<{quantity:'running_oxygen_cost';unit:'ml_O2/kg/km';value:number;methodId:string;rawInputHash:string;synthetic:boolean}>;}
/** Consume a typed CE into the existing predictor only, in a separate context. Native anchors/holds remain untouched. */
export function consumeRunCostV25(envelope:RunCostTransferV25|null,raw:any,nativeRunMLSS:any,asOf:string,context:{simulation:boolean;verifiedArtifacts:Record<string,VerifiedCostArtifactV25>}){
 const reasons:string[]=[];
 if(!envelope||envelope.status==='absent'||envelope.value===null)reasons.push('oxygen_cost_absent_no_score_or_mean_substitution');
 else{
  if(envelope.quantity!=='running_oxygen_cost'||envelope.unit!=='ml_O2/kg/km')reasons.push('score_and_oxygen_cost_are_not_interchangeable');
  if(!Number.isFinite(envelope.value)||envelope.value<=0)reasons.push('positive_explicit_oxygen_cost_required');
  if(envelope.status!=='documented_candidate')reasons.push('reference_quality_uncertain');
  if(!envelope.sourceRef||!(/^[a-f0-9]{64}$/i.test(envelope.sourceArtifactHash??''))||envelope.rawInputHash!==digest(raw))reasons.push('missing_or_wrong_source_and_input_binding');
  const artifact=context.verifiedArtifacts[envelope.sourceArtifactHash];
  if(artifact?.sourceRef!==envelope.sourceRef)reasons.push('source_artifact_not_in_verified_registry');
  if(!artifact?.claims?.some(c=>c.quantity===envelope.quantity&&c.unit===envelope.unit&&c.value===envelope.value&&c.methodId===envelope.method?.id&&c.rawInputHash===envelope.rawInputHash&&c.synthetic===envelope.synthetic))reasons.push('verified_artifact_does_not_support_exact_transferred_claim');
  if(envelope.synthetic&&!context.simulation)reasons.push('synthetic_reference_not_real_individual_evidence');
  const start=Date.parse(envelope.observedAt),end=Date.parse(envelope.validThrough),now=Date.parse(asOf);
  if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(now)||start>now||end<now||end<start)reasons.push('missing_stale_or_future_reference_scope');
  if(envelope.uncertainty?.status!=='documented'||!envelope.uncertainty.basis)reasons.push('uncertainty_not_documented');
  if(envelope.uncertainty?.individualErrorBound!=null&&(!Number.isFinite(envelope.uncertainty.individualErrorBound)||envelope.uncertainty.individualErrorBound<0))reasons.push('invalid_uncertainty_bound');
  if(!envelope.method?.id||!['measured','estimated','synthetic_fixture'].includes(envelope.method.kind)||!['documented_context','experimental_context_only'].includes(envelope.method.admissibility)||envelope.method.kind==='synthetic_fixture'&&!envelope.synthetic)reasons.push('method_not_admissibly_documented');
  if(!Number.isFinite(raw.vlamaxRun)||raw.vlamaxRun<=0)reasons.push('run_vlamax_missing_model_not_computable');
 }
 const eligible=reasons.length===0;
 const prediction=eligible?predictRunMLSSPctFromVLaCE(raw.vlamaxRun,envelope!.value):null;
 const observed=nativeRunMLSS?.observedPct;
 const cross=prediction&&observed!=null?crossValidateRunMLSS(observed,raw.vlamaxRun,envelope!.value):null;
 return{version:'det-v25-physiology-consumption-1',status:eligible?'typed_context_consumed_for_review':'hold_typed_reference',reasons,inputUnchanged:raw,envelope,rawInputHash:digest(raw),nativeRunMLSS,
  experimental:{prediction,crossValidation:cross,observedPct:observed??null,observedReferenceRetained:true},nativeReferenceReplaced:false,nativeRefusalsRemoved:0,scoreConvertedToCost:false,individualValueExperimentallyValidated:false,individualDoseApproved:false,assumedMerged:false,
  limitations:['existing Model C calibration and clamping remain visible','typed input does not validate a measured or estimated value','no field reference is generated or replaced by this context']};
}
