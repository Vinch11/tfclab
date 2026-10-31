/**
 * DET V3.2 — individual sporting pre-qualification, fail-closed.
 *
 * This function is NOT a plan validator and NEVER authorizes publication.
 * It requires explicit coach review of each source against the athlete,
 * verifies source-specific prerequisites, contraindications, timing and
 * physiology, and hands off to DET for weekly caps/periodization/recovery.
 */
import type {V3Workout} from './catalogueRuntime';
import {
 resolveV31Duration, resolveV31Intensity, type V31AthleteCalibration,
 type V31DurationInputs,
} from './resolvePrescription';
import {screenV32Source} from './sportingQualification';

const LEVELS=['untrained','light','trained','highly_trained'] as const;
type Level=typeof LEVELS[number];
export interface V32CoachIndividualReview {
  /** Explicitly scoped to this recipe AND the athlete; no bulk approval. */
  sourceId:string;
  /** Identity of the athlete for whom THIS source was reviewed; never reusable. */
  athleteId:string;
  /** Review invalidated by any edit of the source dose, intent or safety metadata. */
  sourceFingerprint:string;
  athleteScoped:true;
  coachApproved:true;
  trainingLevel:Level;
  trainingLevelSource:'manual';
  currentPhase:string;
  objective:string;
  /** Qualitative training load only; no silent Nolio import. */
  recentLoad:'low'|'moderate'|'high'|'unknown';
  fatigue:'ready'|'fatigued'|'unknown';
  injuryRisk:'cleared_by_coach_screen'|'contraindication_present'|'unknown';
  /** Source strings: each must be visibly acknowledged, not boolean bulk bypass. */
  checkedPrerequisites:readonly string[];
  checkedContraindications:readonly string[];
  stopRuleExplained:true;
  equipmentAndEnvironmentConfirmed:true;
  raceSpecificContextConfirmed?:true;
  testProtocolConfirmed?:true;
  /** A test may establish a missing threshold; coach controls its effort protocol. */
  testEffortGuidanceConfirmed?:true;
  cssPairedTestConfirmed?:true;
  highStimulusHistoryConfirmed?:true;
  runningImpactToleranceConfirmed?:true;
  swimSupervisionConfirmed?:true;
  sportLimitersReviewed:true;
}
export interface V32IndividualInputs {
  /** Athlete who will receive the proposed workout, independently of the review payload. */
  athleteId:string;
  review:V32CoachIndividualReview;
  calibration:V31AthleteCalibration;
  duration:V31DurationInputs;
}
export type V32SportingSelectionStatus=
 |'source_blocked'|'refused_individual_evidence'|'individual_candidate_requires_full_plan_validation';
export interface V32IndividualDecision {
  id:string;
  status:V32SportingSelectionStatus;
  eligibleToSubmitToDet:boolean;
  publishable:false;
  calendarValidationRequired:true;
  athleteSpecificIntensitySegments:number;
  exactDurationSeconds:number|null;
  missing:string[];
  blockingReasons:string[];
  /** May be handed to a calendar optimizer only; never Nolio directly. */
  requiredPlanGates:readonly string[];
}
const PLAN_GATES=[
 'weekly_volume_and_growth_under_coach_cap',
 'prior_and_next_session_exact_recovery_hours',
 'multisport_distribution_and_polarization',
 'periodization_and_true_deload',
 'injury_load_and_session_placement',
 'race_day_and_taper_consistency',
] as const;
function goal(raw:string):string|null {
 const v=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/70[.,]?3|half.?ironman/.test(v))return'half';
 if(/ironman|\bim\b/.test(v))return'ironman';
 if(/semi|half.?marathon|21[.,]?1/.test(v))return'semi';
 if(/marathon|42[.,]?2/.test(v))return'marathon';
 if(/olymp/.test(v))return'olympic';
 if(/sprint/.test(v))return'sprint';
 if(/(?:^|\D)10\s*k(?:m)?(?:\D|$)/.test(v))return'10k';
 if(/(?:^|\D)5\s*k(?:m)?(?:\D|$)/.test(v))return'5k';
 if(/trail/.test(v))return'trail';
 if(/start.?to.?run|debut.*cour|reprise.*cour/.test(v))return'start_to_run';
 if(/fitness|general|remise en forme|renforcement/.test(v))return'general';
 return null;
}
function raceDomainAllows(domain:string|null,objective:string):boolean {
 if(domain==='703_pace')return objective==='half';
 if(domain==='im_pace')return objective==='ironman';
 if(domain==='marathon_pace')return ['marathon','ironman'].includes(objective);
 if(domain==='semi_pace')return objective==='semi';
 return true;
}
export function qualifyV32ForAthlete(
 workout:V3Workout,inputs:V32IndividualInputs,
):V32IndividualDecision {
 const source=screenV32Source(workout);
 const reasons:string[]=[];
 const missing:string[]=[];
 const reject=(reason:string)=>{if(!reasons.includes(reason))reasons.push(reason);};
 const need=(key:string)=>{if(!missing.includes(key))missing.push(key);};
 for(const issue of source.sourceBlockers)reject('source:'+issue);
 const r=inputs.review;
 if(!r||r.coachApproved!==true||r.athleteScoped!==true||r.sourceId!==workout.id)
   reject('source_and_athlete_scoped_coach_approval_missing');
 // A boolean athleteScoped flag is not a binding: prevent review replay across
 // athletes, or after any source update. Caller identity is independently supplied.
 const athleteId=inputs.athleteId?.trim();
 if(!athleteId||!r?.athleteId?.trim()||r.athleteId.trim()!==athleteId)
   reject('individual_coach_review_athlete_id_mismatch');
 if(r?.sourceFingerprint!==source.sourceFingerprint)
   reject('individual_coach_review_stale_source_fingerprint');
 if(!r||r.trainingLevelSource!=='manual'||!LEVELS.includes(r.trainingLevel))
   reject('manual_training_level_missing');
 else if(LEVELS.indexOf(r.trainingLevel)<LEVELS.indexOf(workout.minimumLevel))
   reject('training_level_below_source_minimum');
 if(!workout.phase.includes(r?.currentPhase))
   reject('phase_incompatible_with_source');
 const objective=goal(r?.objective??'');
 if(!objective)reject('race_or_training_objective_missing');
 else if(!raceDomainAllows(workout.primaryDomain,objective))
   reject('race_specific_domain_objective_mismatch');
 if(r?.recentLoad==='unknown'||!['low','moderate','high'].includes(r?.recentLoad??''))
   reject('recent_training_load_not_confirmed');
 if(r?.fatigue==='unknown'||!['ready','fatigued'].includes(r?.fatigue??''))
   reject('current_fatigue_not_confirmed');
 if(r?.injuryRisk!=='cleared_by_coach_screen')
   reject('injury_screen_not_cleared');
 if(r?.stopRuleExplained!==true)reject('source_stop_rule_not_acknowledged');
 if(r?.equipmentAndEnvironmentConfirmed!==true)
   reject('equipment_and_environment_not_confirmed');
 if(r?.sportLimitersReviewed!==true)reject('training_limiters_not_individually_reviewed');
 for(const prerequisite of workout.prerequisites){
   if(!r?.checkedPrerequisites?.includes(prerequisite))
     need('prerequisite_not_approved:'+prerequisite);
 }
 for(const risk of workout.contraindications){
   if(!r?.checkedContraindications?.includes(risk))
     need('contraindication_not_reviewed:'+risk);
 }
 if(workout.primaryIntent==='race_specific'&&r?.raceSpecificContextConfirmed!==true)
   reject('race_specific_relevance_not_confirmed');
 if(workout.primaryIntent==='test'){
   if(r?.testProtocolConfirmed!==true)reject('test_protocol_not_confirmed');
   if(r?.testEffortGuidanceConfirmed!==true)
     reject('test_effort_guidance_not_coach_confirmed');
 }
 if(['V3P_SWIM_091','V3P_SWIM_092'].includes(workout.id)&&r?.cssPairedTestConfirmed!==true)
   reject('css_requires_400m_and_200m_together_not_a_single_trial');
 if(['mlss','sub_threshold','vo2max','neuromuscular','mixed_intensity'].includes(workout.primaryIntent)){
   if(r?.highStimulusHistoryConfirmed!==true)
     reject('high_stimulus_training_history_not_confirmed');
   if(r?.fatigue==='fatigued')reject('high_intensity_during_fatigue');
 }
 if(workout.sport==='run'&&r?.runningImpactToleranceConfirmed!==true)
   reject('running_impact_tolerance_not_confirmed');
 if(workout.sport==='swim'&&r?.swimSupervisionConfirmed!==true)
   reject('swimming_safety_supervision_not_confirmed');
 // Swimming time and intensity must come from the SAME confirmed athlete paces.
 // Two independent maps with conflicting numbers could otherwise pass separately.
 if(workout.sport==='swim'){
   for(const segment of workout.prescriptionContract.intensity.segments){
     if(!segment.domain)continue;
     const intensityPace=inputs.calibration?.swimPacesSecondsPer100m?.[segment.domain];
     const durationPace=inputs.duration?.swimPacesSecondsPer100m?.[segment.domain];
     if(intensityPace!==undefined&&durationPace!==undefined&&intensityPace!==durationPace)
       reject('swim_calibration_duration_pace_mismatch:'+segment.domain);
   }
 }
 let intensitySegments=0,durationSeconds:number|null=null;
 if(workout.primaryIntent==='test'){
   // A controlled field test may be needed precisely BECAUSE the athlete's
   // threshold is unknown. Never invent an FTP/CSS/pace to run the test.
   // Coach-confirmed test instructions replace metric-derived intensities.
   intensitySegments=0;
 }else try {
   const intensity=resolveV31Intensity(workout,inputs.calibration);
   intensitySegments=intensity.segments.length;
   for(const miss of intensity.missing)need('intensity:'+miss);
 }catch{reject('individual_intensity_source_or_structure_invalid');}
 try {
  const duration=resolveV31Duration(workout,inputs.duration);
  if(duration.status==='confirmed'){
    durationSeconds=duration.seconds;
    if(!duration.wholeMinuteSlot)
      need('det_current_minute_slot_incompatible_preserve_exact_seconds');
  }else for(const miss of duration.missing)need('duration:'+miss);
 }catch{reject('individual_duration_source_or_structure_invalid');}
 const blocked=source.sourceStatus==='source_blocked';
 const ready=!blocked&&reasons.length===0&&missing.length===0;
 return {
  id:workout.id,
  status:blocked?'source_blocked':ready?
    'individual_candidate_requires_full_plan_validation':'refused_individual_evidence',
  eligibleToSubmitToDet:ready,
  publishable:false,calendarValidationRequired:true,
  athleteSpecificIntensitySegments:intensitySegments,exactDurationSeconds:durationSeconds,
  blockingReasons:reasons,missing,
  requiredPlanGates:PLAN_GATES,
 };
}
