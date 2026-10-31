/**
 * V3.3 — source-specific SPORTING gate for all 800 experimental candidates.
 * It integrates PR #448's 400 original individual source screens and
 * 400 additionally screened V3.1 recipes, with source-drift protection.
 * Source prequalification is NOT scientific validation or athlete approval.
 */
import raw from "./v33SportingReview800.json";
import {v3FullCatalogue, type V3Workout, type V3Block} from "./catalogueRuntime";

export type V3SportingSourceStatus="source_blocked"|"source_prequalified_pending_individual_review";
export interface V3SportingSourceRecord {
 id:string;
 sport:string;
 sourceFingerprint:string;
 sourceStatus:V3SportingSourceStatus;
 reviewOrigin:string;
 originReviewFingerprint:string|null;
 sourceBlockers:string[];
 primaryIntent:string;
 primaryDomain:string|null;
 limiterKeys:string[];
 mainDomainIds:Array<string|null>;
 minimumLevel:string;
 phases:string[];
 minimumRecoveryHours:number;
 prerequisites:string[];
 contraindications:string[];
 equipment:string[];
 humanSportingApproved:false;
 scientificSessionValidated:false;
 athleteApproved:false;
}
export interface V3IndividualSportingEvidence {
 /** Explicitly supplied athlete identifier; see expectedAthleteId for independent binding. */
 athleteId:string;
 sourceFingerprint:string;
 coachReviewedSource:true;
 currentPhase:string;
 recentLoad:"low"|"moderate"|"high"|"unknown";
 fatigue:"ready"|"fatigued"|"unknown";
 injuryScreen:"cleared_by_coach"|"contraindication"|"unknown";
 checkedPrerequisites:readonly string[];
 checkedContraindications:readonly string[];
 stopRuleExplained:true;
 environmentAndEquipmentConfirmed:true;
 limiterAndSportingGoalReviewed:true;
 trainingLoadCompatible:true;
 recoveryContextReviewed:true;
 highIntensityHistoryConfirmed?:true;
 runningImpactToleranceConfirmed?:true;
 swimmingSafetyConfirmed?:true;
 racePaceGoalConfirmed?:true;
 testProtocolConfirmed?:true;
 cssPairedTestConfirmed?:true;
}
export interface V3SportingGateResult {
 status:"refused"|"individual_candidate_requires_full_plan_validation";
 sourceStatus:V3SportingSourceStatus;
 allowedToSubmitToDet:boolean;
 approvedForPublication:false;
 athleteReviewRequired:true;
 blockingReasons:string[];
 requiredPlanChecks:readonly string[];
 sourceFingerprint:string;
}
const RECORDS:ReadonlyArray<V3SportingSourceRecord>=raw.records as V3SportingSourceRecord[];
const REGISTRY=new Map(RECORDS.map(r=>[r.id,r]));
const LEVELS=["untrained","light","trained","highly_trained"] as const;
const HIGH=new Set(["mlss","sub_threshold","mixed_intensity","vo2max","neuromuscular","test"]);
const PLAN_CHECKS=[
 "weekly_volume_within_coach_limit","load_progression_and_true_deload",
 "polarization_and_quality_frequency","specific_limiter_and_phase_relevance",
 "injury_risk_and_cross_sport_fatigue","source_end_to_start_recovery_by_confirmed_session_times",
 "race_day_and_taper_consistency","calendar_sport_minute_allocation",
] as const;
function fPayload(w:V3Workout):string {
 return JSON.stringify({
  id:w.id,title:w.title,primaryIntent:w.primaryIntent,primaryDomain:w.primaryDomain,
  phase:w.phase,minimumLevel:w.minimumLevel,focus:w.focus,
  contraindications:w.contraindications,stopRule:w.stopRule,
  minimumRecoveryHours:w.minimumRecoveryHours,prerequisites:w.prerequisites,
  equipment:(w as V3Workout&{equipment?:string[]}).equipment??null,
  blocks:w.blocks,prescription:w.prescription,
 });
}
/** Reproducible source-change detector (FNV-1a, noncryptographic). */
export function fingerprintV3SportingSource(w:V3Workout):string {
 const s=fPayload(w);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,"0");
}
function mainLeaves(blocks:readonly V3Block[]):Exclude<V3Block,{kind:"repeat"}>[] {
 return blocks.flatMap(b=>b.kind==="repeat"?mainLeaves(b.steps):b.role==="main"?[b]:[]);
}
function recomputeSourceBlockers(w:V3Workout):string[]{
 const codes:string[]=[];
 const add=(s:string)=>{if(!codes.includes(s))codes.push(s);};
 const main=mainLeaves(w.blocks),domains=new Set(main.map(m=>m.domain).filter(Boolean));
 if(!main.length)add("missing_primary_work");
 if(w.primaryDomain!==null&&!domains.has(w.primaryDomain))add("primary_domain_not_in_main");
 if(w.primaryIntent==="mlss"&&w.primaryDomain!=="mlss")add("mlss_intent_domain_mismatch");
 if(w.primaryIntent==="sub_threshold"&&w.primaryDomain!=="sub_threshold")add("sub_threshold_intent_domain_mismatch");
 if(w.primaryIntent==="mixed_intensity"&&domains.size<2)add("mixed_stimulus_requires_two_main_domains");
 if(w.primaryIntent==="neuromuscular"&&w.sport!=="strength"){
  // New timeboxed sprint candidates require at least five times as much easy recovery.
  if(Number(w.id.slice(-3))>100){
   const recovered=w.blocks.some(b=>b.kind==="repeat"&&
     b.steps.some(step=>step.kind==="time"&&step.domain==="neuromuscular"&&
       b.steps.some(rest=>rest.kind==="time"&&rest.domain==="recovery"&&
         rest.seconds!.base>=5*step.seconds!.base)));
   if(!recovered)add("short_sprint_recovery_less_than_five_to_one");
  }
  if(main.some(m=>m.kind==="time"&&m.domain==="neuromuscular"&&m.seconds!.base>45))
   add("neuromuscular_burst_over_45s");
  if(main.some(m=>m.kind==="distance"&&m.domain==="neuromuscular"&&m.meters!.base>=50))
   add("swim_50m_alactic_not_proven");
 }
 if(w.sport==="strength"&&!(w as V3Workout&{equipment?:string[]}).equipment?.length)
  add("strength_equipment_missing");
 if(w.primaryIntent==="test"&&!w.prerequisites.some(p=>/protocole/i.test(p)))
  add("test_protocol_prerequisite_missing");
 if(!w.prescription?.physiologicalIntent?.limiterKeys?.length)add("limiter_keys_missing");
 if(!Number.isFinite(w.minimumRecoveryHours)||w.minimumRecoveryHours<0)add("minimum_recovery_invalid");
 return codes;
}
export function auditV3SportingRegistry(workouts:readonly V3Workout[]=v3FullCatalogue.workouts):string[]{
 const errors:string[]=[];
 if(RECORDS.length!==800||REGISTRY.size!==800)errors.push("V3_SPORTING_REGISTER_800_MISSING_OR_DUPLICATE");
 if(workouts.length!==800)errors.push("V3_SPORTING_SOURCE_800_COUNT_MISMATCH");
 const sourceIds=new Set(workouts.map(w=>w.id));
 if(sourceIds.size!==workouts.length)errors.push("V3_SPORTING_DUPLICATE_SOURCE_ID");
 for(const r of RECORDS)if(!sourceIds.has(r.id))errors.push(r.id+":REGISTER_SOURCE_NOT_FOUND");
 for(const w of workouts) {
  const r=REGISTRY.get(w.id);
  if(!r){errors.push(w.id+":SPORTING_SCREEN_MISSING");continue;}
  if(r.sourceFingerprint!==fingerprintV3SportingSource(w))errors.push(w.id+":SPORTING_SOURCE_FINGERPRINT_DRIFT");
  if(r.sport!==w.sport||r.primaryIntent!==w.primaryIntent||r.primaryDomain!==w.primaryDomain||
     r.minimumRecoveryHours!==w.minimumRecoveryHours||
     JSON.stringify(r.phases)!==JSON.stringify(w.phase)||
     JSON.stringify(r.prerequisites)!==JSON.stringify(w.prerequisites)||
     JSON.stringify(r.contraindications)!==JSON.stringify(w.contraindications))
    errors.push(w.id+":SPORTING_SOURCE_METADATA_DRIFT");
  const blockerSet=new Set(r.sourceBlockers);
  const current=recomputeSourceBlockers(w);
  for(const b of current)if(!blockerSet.has(b))errors.push(w.id+":UNRECORDED_SPORTING_BLOCKER:"+b);
  if(!["source_blocked","source_prequalified_pending_individual_review"].includes(r.sourceStatus)||
     (r.sourceStatus==="source_blocked")!==Boolean(r.sourceBlockers.length))
    errors.push(w.id+":SPORTING_SOURCE_DECISION_INCONSISTENT");
  if(r.humanSportingApproved!==false||r.scientificSessionValidated!==false||r.athleteApproved!==false)
    errors.push(w.id+":FALSE_SCIENTIFIC_OR_HUMAN_APPROVAL");
 }
 return errors;
}
export function sourceV3SportingStatus(id:string):V3SportingSourceRecord|undefined{
 return REGISTRY.get(id);
}
/** Required *before* translating approved source candidates into DET repair metadata. */
export function qualifyV3IndividualSportingSource(
 w:V3Workout, evidence:V3IndividualSportingEvidence|undefined,
 expectedAthleteId:string|undefined,
):V3SportingGateResult {
 const record=REGISTRY.get(w.id);
 const reasons:string[]=[];
 const deny=(x:string)=>{if(!reasons.includes(x))reasons.push(x);};
 if(!record){deny("source_not_in_800_sporting_register");}
 if(record&&record.sourceFingerprint!==fingerprintV3SportingSource(w))
  deny("source_changed_since_sporting_review");
 if(record?.sourceStatus==="source_blocked")deny("sporting_source_blocked:"+record.sourceBlockers.join(","));
 for(const issue of recomputeSourceBlockers(w))deny("sporting_source_invalid:"+issue);
 if(!evidence||!expectedAthleteId?.trim()||!evidence.athleteId?.trim()||
    evidence.athleteId!==expectedAthleteId)deny("athlete_scoped_review_identity_missing_or_mismatched");
 if(evidence?.sourceFingerprint!==fingerprintV3SportingSource(w))deny("coach_review_stale_source_fingerprint");
 if(evidence?.coachReviewedSource!==true)deny("explicit_individual_coach_review_missing");
 if(!evidence?.currentPhase||!w.phase.includes(evidence.currentPhase))deny("coach_review_phase_incompatible");
 if(evidence?.recentLoad==="unknown"||!["low","moderate","high"].includes(evidence?.recentLoad??""))
  deny("qualitative_training_load_unknown");
 if(evidence?.fatigue==="unknown"||!["ready","fatigued"].includes(evidence?.fatigue??""))
  deny("current_fatigue_unknown");
 if(evidence?.injuryScreen!=="cleared_by_coach")deny("injury_screen_not_cleared");
 if(evidence?.stopRuleExplained!==true)deny("stop_rule_not_confirmed");
 if(evidence?.environmentAndEquipmentConfirmed!==true)deny("equipment_environment_not_confirmed");
 if(evidence?.limiterAndSportingGoalReviewed!==true)deny("limiter_goal_not_verified");
 if(evidence?.trainingLoadCompatible!==true)deny("recent_load_not_compatible_with_workout");
 if(evidence?.recoveryContextReviewed!==true)deny("recovery_context_not_reviewed");
 for(const p of w.prerequisites)if(!evidence?.checkedPrerequisites?.includes(p))
  deny("prerequisite_not_checked:"+p);
 for(const x of w.contraindications)if(!evidence?.checkedContraindications?.includes(x))
  deny("contraindication_not_reviewed:"+x);
 if(HIGH.has(w.primaryIntent)){
  if(evidence?.highIntensityHistoryConfirmed!==true)deny("intense_stimulus_history_not_verified");
  if(evidence?.fatigue!=="ready")deny("high_intensity_requires_ready_fatigue");
 }
 if(w.sport==="run"&&evidence?.runningImpactToleranceConfirmed!==true)
  deny("running_impact_tolerance_not_verified");
 if(w.sport==="swim"&&evidence?.swimmingSafetyConfirmed!==true)
  deny("swimming_supervision_and_technique_not_verified");
 if(w.primaryIntent==="race_specific"&&evidence?.racePaceGoalConfirmed!==true)
  deny("race_pace_goal_not_verified");
 if(w.primaryIntent==="test"&&evidence?.testProtocolConfirmed!==true)
  deny("test_protocol_not_individually_confirmed");
 if(["V3P_SWIM_091","V3P_SWIM_092"].includes(w.id)&&
    evidence?.cssPairedTestConfirmed!==true)
  deny("css_400_and_200_pair_must_be_verified_together");
 const accepted=reasons.length===0;
 return {status:accepted?"individual_candidate_requires_full_plan_validation":"refused",
  sourceStatus:record?.sourceStatus??"source_blocked",allowedToSubmitToDet:accepted,
  approvedForPublication:false,athleteReviewRequired:true,blockingReasons:reasons,
  requiredPlanChecks:PLAN_CHECKS,sourceFingerprint:fingerprintV3SportingSource(w)};
}
