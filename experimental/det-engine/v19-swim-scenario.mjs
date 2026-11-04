/** Explicit synthetic coaching scenario. Arithmetic feasibility is never capacity proof. */
export function evaluateSwimScenario(record,input){
 const reasons=[],source=record.originalCanonical.original.effective.structure;
 if(record.legacyId!=='A_SWIM_TRI_OPEN_WATER_SIMU')reasons.push('scenario_source_not_supported');
 if(input.synthetic!==true||!input.provenance||!input.paceEvidence)reasons.push('explicit_synthetic_evidence_required');
 if(!Number.isFinite(input.meters)||input.meters<1500||input.meters>2500)reasons.push('outside_written_distance_range');
 if(input.stroke!==input.paceStroke||!['crawl','brasse','dos','papillon'].includes(input.stroke))reasons.push('stroke_specific_reference_required');
 if(input.referenceKind!=='declared_task_specific_pace')reasons.push('css_not_a_z2_execution_time_model');
 if(!Number.isFinite(input.secondsPer100m)||input.secondsPer100m<=0||!Number.isFinite(input.windowMinutes)||input.windowMinutes<=0)reasons.push('missing_execution_inputs');
 if(input.openWaterAccess!==true||input.coldWaterRestrictionCleared!==true)reasons.push('source_open_water_prerequisites_unresolved');
 const seconds=Number.isFinite(input.meters)&&Number.isFinite(input.secondsPer100m)?input.meters/100*input.secondsPer100m:null;
 if(seconds!==null&&seconds>input.windowMinutes*60)reasons.push('window_insufficient_without_truncation');
 return{legacyId:record.legacyId,input,sourceInstructions:source,arithmeticSeconds:seconds,arithmeticFitsWindow:reasons.length===0,reasons,
   distanceTruncated:false,individualCapacityProven:false,sourceTimelinesAdded:0,syntheticOnly:true,
   uncertainties:['open_water_conditions_and_navigation_variability','task_specific_pace_is_a_synthetic_declaration','recovery_and_whole_microcycle_not_attested'],
   structuredNolio:{payload:null,reason:'stroke_distance_open_water_machine_contract_not_demonstrated'},automaticPrescription:false};
}
