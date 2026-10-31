/**
 * V3.2 — 400/400 sport-specific source screening (NOT scientific approval).
 *
 * The dose audit walks each real source block, including nested repetitions
 * and (n-1) recoveries. Swimming stays in metres until measured paces exist;
 * strength movement time stays unknown until coach-confirmed. Never infer a
 * person's training history, limiter, LT1, CSS, injury clearance or calendar.
 */
import type {V3Block,V3Workout,V3Sport} from './catalogueRuntime';
import {auditV31PrescriptionContract} from './prescriptionContract';

export type V32SourceStatus='source_blocked'|'source_prequalified_pending_coach_review';
export interface V32DoseBounds {
  timeSeconds:{min:number;base:number;max:number};
  distanceMeters:{min:number;base:number;max:number};
  reps:{min:number;base:number;max:number};
  movementTimeUnconfirmed:boolean;
  swimPaceUnconfirmed:boolean;
}
export interface V32SourceQualification {
  id:string;
  /** Non-cryptographic source-drift fingerprint, not a scientific signature. */
  sourceFingerprint:string;
  sport:V3Sport;
  sourceStatus:V32SourceStatus;
  automatedReviewOnly:true;
  approvedForAthlete:false;
  physiologicalIntent:string;
  physiologicalDomain:string|null;
  capacityFocus:string;
  targetIsNotDiagnosedLimiter:true;
  minimumLevel:string;
  permittedPhases:string[];
  minimumRecoveryHours:number;
  dose:V32DoseBounds;
  sourceBlockers:string[];
  sportSafetyFlags:string[];
  requiredIndividualProof:string[];
}

function add(a:V32DoseBounds,b:V32DoseBounds):V32DoseBounds {
 const plus=(k:'min'|'base'|'max')=>({time:a.timeSeconds[k]+b.timeSeconds[k],
    meters:a.distanceMeters[k]+b.distanceMeters[k],reps:a.reps[k]+b.reps[k]});
 const min=plus('min'),base=plus('base'),max=plus('max');
 return {timeSeconds:{min:min.time,base:base.time,max:max.time},
   distanceMeters:{min:min.meters,base:base.meters,max:max.meters},
   reps:{min:min.reps,base:base.reps,max:max.reps},
   movementTimeUnconfirmed:a.movementTimeUnconfirmed||b.movementTimeUnconfirmed,
   swimPaceUnconfirmed:a.swimPaceUnconfirmed||b.swimPaceUnconfirmed};
}
function empty():V32DoseBounds {return {
 timeSeconds:{min:0,base:0,max:0},distanceMeters:{min:0,base:0,max:0},
 reps:{min:0,base:0,max:0},movementTimeUnconfirmed:false,swimPaceUnconfirmed:false,
};}
function bounds(blocks:readonly V3Block[],sport:V3Sport):V32DoseBounds{
 let sum=empty();
 for(const b of blocks){
  let item=empty();
  if(b.kind==='repeat'){
   const inner=bounds(b.steps,sport);
   const time=(k:'min'|'base'|'max')=>inner.timeSeconds[k]*b.count[k]+Math.max(0,b.count[k]-1)*b.betweenSec;
   item={timeSeconds:{min:time('min'),base:time('base'),max:time('max')},
    distanceMeters:{min:inner.distanceMeters.min*b.count.min,
      base:inner.distanceMeters.base*b.count.base,
      max:inner.distanceMeters.max*b.count.max},
    reps:{min:inner.reps.min*b.count.min,base:inner.reps.base*b.count.base,
      max:inner.reps.max*b.count.max},
    movementTimeUnconfirmed:inner.movementTimeUnconfirmed,
    swimPaceUnconfirmed:inner.swimPaceUnconfirmed};
  }else if(b.kind==='time'){
   item.timeSeconds={...b.seconds!};
  }else if(b.kind==='distance'){
   item.distanceMeters={...b.meters!};
   item.swimPaceUnconfirmed=sport==='swim';
  }else{
   item.reps={min:b.reps!.min*b.sides!,base:b.reps!.base*b.sides!,max:b.reps!.max*b.sides!};
   item.movementTimeUnconfirmed=true;
  }
  sum=add(sum,item);
 }
 return sum;
}
function leaves(blocks:readonly V3Block[]):Array<Exclude<V3Block,{kind:'repeat'}>> {
 return blocks.flatMap(b=>b.kind==='repeat'?leaves(b.steps):[b]);
}
/** Snapshot detector: reproducibility only, not an authentication mechanism. */
export function v32SourceFingerprint(w:V3Workout):string {
 const payload=JSON.stringify({
   id:w.id,title:w.title,primaryIntent:w.primaryIntent,primaryDomain:w.primaryDomain,
   phase:w.phase,minimumLevel:w.minimumLevel,focus:w.focus,
   contraindications:w.contraindications,stopRule:w.stopRule,
   minimumRecoveryHours:w.minimumRecoveryHours,prerequisites:w.prerequisites,
   equipment:(w as V3Workout&{equipment?:string[]}).equipment??null,
   blocks:w.blocks,prescriptionContract:w.prescriptionContract,
 });
 let h=2166136261;
 for(let i=0;i<payload.length;i++){h^=payload.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0');
}
const HIGH=new Set(['mlss','sub_threshold','vo2max','neuromuscular','mixed_intensity']);
export function screenV32Source(workout:V3Workout):V32SourceQualification {
 const sourceBlockers:string[]=[];
 const sportSafetyFlags:string[]=[];
 const requiredIndividualProof:string[]=[
   'explicit_individual_coach_review','athlete_training_level_manual',
   'current_training_load_qualitative','fatigue_and_injury_screen',
   'all_source_prerequisites_verified','all_source_contraindications_reviewed',
   'training_phase_and_calendar_recovery','intensity_anchor_provenance',
   'executed_duration_calculable_without_rounding','weekly_load_and_progression_validated',
 ];
 const addFlag=(code:string)=>{if(!sportSafetyFlags.includes(code))sportSafetyFlags.push(code);};
 const addBlocker=(code:string)=>{if(!sourceBlockers.includes(code))sourceBlockers.push(code);};
 for(const issue of auditV31PrescriptionContract(workout))addBlocker(issue);
 if(!workout.focus?.trim()||!workout.stopRule?.trim()||
   !workout.contraindications?.length||!workout.phase?.length)addBlocker('incomplete_sporting_context');
 if(workout.status!=='candidate'||workout.automaticSelection!==false)
   addBlocker('unauthorized_source_status');
 if(!Number.isFinite(workout.minimumRecoveryHours)||workout.minimumRecoveryHours<0)
   addBlocker('invalid_recovery_hours');
 const all=leaves(workout.blocks);
 const main=all.filter(x=>x.role==='main');
 const warm=all.filter(x=>x.role==='warmup');
 if(!main.length)addBlocker('missing_primary_work');
 if(!warm.length)addBlocker('missing_warmup_block');
 if(!workout.blocks.length)addBlocker('empty_session');
 if(workout.primaryDomain!==null&&!main.some(x=>x.domain===workout.primaryDomain))
   addBlocker('primary_domain_not_in_main_work');
 if(workout.primaryIntent==='mlss'&&workout.primaryDomain!=='mlss')
   addBlocker('mlss_intent_without_mlss_domain');
 if(workout.primaryIntent==='sub_threshold'&&workout.primaryDomain!=='sub_threshold')
   addBlocker('sub_threshold_intent_mismatch');
 if(workout.primaryIntent==='mixed_intensity'&&
    new Set(main.map(x=>x.domain).filter(Boolean)).size<2)
   addBlocker('mixed_intensity_requires_multiple_main_domains');
 if(workout.primaryIntent==='neuromuscular'&&workout.sport!=='strength'){
   const tooLong=main.some(x=>x.domain==='neuromuscular'&&x.kind==='time'&&x.seconds!.base>45);
   if(tooLong)addBlocker('neuromuscular_work_interval_over_45s_requires_reclassification');
   const longSwim=main.some(x=>x.domain==='neuromuscular'&&x.kind==='distance'&&x.meters!.base>=50);
   if(longSwim)addBlocker('swim_50m_sprint_not_proven_alactic');
 }
 if(workout.primaryIntent==='test'){
   addFlag('test_requires_separate_protocol_and_measurement_review');
   requiredIndividualProof.push('coach_confirmed_test_protocol','test_execution_and_interpretation_validated');
   if(!workout.prerequisites.some(x=>/protocole/i.test(x)))
     addBlocker('test_protocol_prerequisite_missing');
   if(['V3P_SWIM_091','V3P_SWIM_092'].includes(workout.id))
     addFlag('css_400_200_paired_protocol_required_individual_time_not_CSS');
 }
 if(workout.primaryIntent==='race_specific'){
   addFlag('race_goal_pacing_and_event_specificity_must_match');
   requiredIndividualProof.push('race_goal_distance_compatible','event_specific_context_confirmed');
 }
 if(HIGH.has(workout.primaryIntent)){
   addFlag('high_stimulus_dose_and_recovery_review');
   requiredIndividualProof.push('quality_workout_tolerance_confirmed');
 }
 if(workout.sport==='swim'){
   addFlag('swimming_supervision_airway_and_shoulder_screen');
   requiredIndividualProof.push('swim_pace_per_domain_confirmed');
 }
 if(workout.sport==='run'){
   addFlag('running_impact_tolerance_and_surface');
   requiredIndividualProof.push('running_impact_history_compatible');
 }
 if(workout.sport==='bike'){
   addFlag('bike_fit_environment_and_power_calibration');
   requiredIndividualProof.push('cycling_power_or_effort_reference_verified');
 }
 if(workout.sport==='strength'){
   addFlag('exercise_specific_technical_execution_and_load');
   requiredIndividualProof.push('equipment_available','loads_or_RPE_per_exercise',
     'measured_movement_times_and_transitions');
   const equipment=(workout as V3Workout & {equipment?:string[]}).equipment;
   if(!equipment?.length)addBlocker('strength_equipment_not_declared');
 }
 const dose=bounds(workout.blocks,workout.sport);
 if(dose.movementTimeUnconfirmed)addFlag('strength_duration_requires_measured_repetition_time');
 if(dose.swimPaceUnconfirmed)addFlag('swim_duration_requires_individual_paces');
 if(dose.timeSeconds.base<=0&&dose.distanceMeters.base<=0&&dose.reps.base<=0)
   addBlocker('non_executable_workout');
 if(workout.minimumLevel==='highly_trained'){
   addFlag('high_training_level_must_be_manually_confirmed');
 }
 return {
   id:workout.id,sourceFingerprint:v32SourceFingerprint(workout),sport:workout.sport,
   sourceStatus:sourceBlockers.length?'source_blocked':'source_prequalified_pending_coach_review',
   automatedReviewOnly:true,approvedForAthlete:false,
   physiologicalIntent:workout.primaryIntent,
   physiologicalDomain:workout.primaryDomain,
   capacityFocus:workout.prescriptionContract.physiology.capacityFocus,
   targetIsNotDiagnosedLimiter:true,
   minimumLevel:workout.minimumLevel,permittedPhases:[...workout.phase],
   minimumRecoveryHours:workout.minimumRecoveryHours,dose,
   sourceBlockers,sportSafetyFlags,
   requiredIndividualProof:[...new Set(requiredIndividualProof)].sort(),
 };
}
export function screenV32Catalogue(all:readonly V3Workout[]):V32SourceQualification[]{
 if(all.length!==400||new Set(all.map(w=>w.id)).size!==400)
   throw Error('V32_REQUIRES_EXACT_400_UNIQUE_SOURCES');
 return all.map(screenV32Source);
}
