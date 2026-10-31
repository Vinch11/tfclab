/**
 * TFCLab V3.1 — complete, source-bound prescription contract for EVERY V3 recipe.
 *
 * These are STRUCTURED requirements, not invented athlete calibrations.
 * All quantitative athlete values are resolved separately and remain unknown
 * until supplied/confirmed. A complete template does NOT imply automatic
 * eligibility, individual suitability or scientific validation.
 */
import type { V3Workout, V3Block, V3Leaf, V3Intent, V3Sport } from './catalogueRuntime';
import type { DoctrineDomainId } from '../../src/lib/zones/tfclDoctrine';

export interface V3PrescriptionContract {
  schemaVersion:'3.1.0';
  physiology:{
    primaryIntent:V3Intent;
    primaryDomain:DoctrineDomainId|null;
    capacityFocus:string;
    individualCalibrationRequired:true;
    /** Never treat this label as proof of a causal athlete limiter. */
    limiterInterpretation:'training_target_not_diagnosed_limiter';
  };
  intensity:{
    mapping:'tfcl_doctrine_individual_thresholds_or_coach_load';
    segments:Array<{path:string;role:string;domain:DoctrineDomainId|null;anchorKey:string}>;
    /** Actual athlete values are NOT stored inside a generic workout. */
    athleteValues:'required_at_selection_time';
  };
  duration:{
    method:'sum_time_seconds'|'swim_pace_dependent'|'strength_measured_execution_dependent';
    requiredInputs:string[];
    rounding:'none';
    unknownValues:'block_not_estimate';
  };
  safety:{
    minimumRecoveryHours:number;
    prerequisitesMustBeVerified:true;
    contraindicationsMustBeReviewed:true;
    stopRuleMustBeReviewed:true;
    coachApprovalForAthleteRequired:true;
  };
  eligibility:{
    state:'candidate';
    automaticSelection:false;
    scientificValidation:'not_session_specifically_validated';
  };
}
const CAPACITY:Record<V3Intent,string>={
 recovery:'recovery_and_load_management',
 moderate_lt1:'aerobic_endurance_and_lt1',
 sub_threshold:'sustainable_work_below_mlss_not_threshold',
 mixed_intensity:'mixed_heavy_severe_domain_transitions',
 mlss:'threshold_sustainable_power_or_speed',
 vo2max:'maximal_aerobic_power',
 neuromuscular:'neuromuscular_power_and_speed',
 max_strength:'maximal_strength',
 strength_endurance:'local_muscular_endurance',
 technique_economy:'movement_technique_or_economy',
 mobility_prevention:'movement_control_and_tolerance',
 mixed_specific:'integrated_race_demands',
 race_specific:'race_specific_pacing',
 fatmax:'aerobic_oxidative_capacity',
 test:'capacity_measurement',
};
function walk(blocks:readonly V3Block[],prefix=''):
 Array<{path:string;leaf:V3Leaf}> {
  return blocks.flatMap((block,i)=>{
    const path=prefix?prefix+'.'+i:String(i);
    return block.kind==='repeat'?walk(block.steps,path):[{path,leaf:block}];
  });
}
export function v31AnchorKey(sport:V3Sport, domain:DoctrineDomainId|null):string {
  if(sport==='strength')return 'coach_confirmed_exercise_load_or_RPE';
  if(sport==='swim')return domain?'swim_domain_pace_seconds_per_100m:'+domain:
    'coach_confirmed_swim_effort';
  if(sport==='bike'){
    if(domain==='neuromuscular')return 'bike_sprint_power_individual_reference';
    if(domain==='vo2max')return 'bike_FTP_and_PMA_individual_references';
    if(domain==='moderate_lt1'||domain==='recovery')return 'bike_FTP_and_LT1_individual_references';
    return 'bike_FTP_or_MLSS_power_individual_reference';
  }
  if(domain==='neuromuscular')return 'run_neuromuscular_speed_individual_reference';
  if(domain==='vo2max')return 'run_MLSS_and_vVO2max_individual_references';
  if(domain==='moderate_lt1'||domain==='recovery')return 'run_MLSS_and_LT1_individual_references';
  return 'run_MLSS_pace_individual_reference';
}
/**
 * Canonical template metadata derived ONLY from a recipe's declared
 * structured blocks, physiological intent and source safety requirements.
 * No FTP, CSS, threshold, RPE or execution time is inferred.
 */
export function expectedV31PrescriptionContract(workout:V3Workout):V3PrescriptionContract {
  const leaves=walk(workout.blocks);
  const inputs:string[]=[];
  if(workout.sport==='swim')for(const {leaf} of leaves){
    if(leaf.kind==='distance'&&leaf.domain)
      inputs.push('coach_confirmed_swim_pace_sec_per_100m:'+leaf.domain);
  }
  if(workout.sport==='strength'){
    inputs.push('coach_confirmed_strength_load_or_RPE');
    for(const {path,leaf} of leaves)if(leaf.kind==='reps')
      inputs.push('coach_measured_execution_seconds_per_repetition:'+path);
    // The session's transition/setup time varies and cannot be inferred
    // from repetitions, a tempo estimate or a nominal warmup.
    inputs.push('coach_confirmed_setup_transition_seconds');
  }
  const method=workout.sport==='strength'?'strength_measured_execution_dependent':
    workout.sport==='swim'?'swim_pace_dependent':'sum_time_seconds';
  return {
    schemaVersion:'3.1.0',
    physiology:{
      primaryIntent:workout.primaryIntent,
      primaryDomain:workout.primaryDomain,
      capacityFocus:CAPACITY[workout.primaryIntent],
      individualCalibrationRequired:true,
      limiterInterpretation:'training_target_not_diagnosed_limiter',
    },
    intensity:{
      mapping:'tfcl_doctrine_individual_thresholds_or_coach_load',
      segments:leaves.map(({path,leaf})=>({path,role:leaf.role,
        domain:leaf.domain,anchorKey:v31AnchorKey(workout.sport,leaf.domain)})),
      athleteValues:'required_at_selection_time',
    },
    duration:{
      method,requiredInputs:[...new Set(inputs)].sort(),
      rounding:'none',unknownValues:'block_not_estimate',
    },
    safety:{
      minimumRecoveryHours:workout.minimumRecoveryHours,
      prerequisitesMustBeVerified:true,
      contraindicationsMustBeReviewed:true,
      stopRuleMustBeReviewed:true,
      coachApprovalForAthleteRequired:true,
    },
    eligibility:{
      state:'candidate',automaticSelection:false,
      scientificValidation:'not_session_specifically_validated',
    },
  };
}
export function auditV31PrescriptionContract(workout:V3Workout):string[]{
  const proposed=(workout as V3Workout & {prescriptionContract?:V3PrescriptionContract}).prescriptionContract;
  if(!proposed)return [workout.id+':MISSING_V31_PRESCRIPTION_CONTRACT'];
  if(!Number.isFinite(workout.minimumRecoveryHours)||workout.minimumRecoveryHours<0)
    return [workout.id+':INVALID_RECOVERY_HOURS'];
  const expected=expectedV31PrescriptionContract(workout);
  // Source-bound exact equality: no cosmetic placeholder can satisfy this gate.
  if(JSON.stringify(proposed)!==JSON.stringify(expected))
    return [workout.id+':PRESCRIPTION_CONTRACT_SOURCE_MISMATCH'];
  return [];
}
