/**
 * V32 — Three exact, candidate-only 70.3 quality-brick compositions from
 * INDIVIDUALLY reviewed V3 bike and run source contracts.
 *
 * A composition is never a conversion or approval of a legacy brick. Nothing
 * here rewrites the original 400 recipes or proves sporting equivalence.
 */
import {
  isCompleteRepairWorkoutMetadata, normalizeRepairGoal,
  type RepairWorkoutMetadata,
} from '../../supabase/functions/_shared/repairSportingEquivalence';

export const V32_703_BRICK_BLUEPRINTS = [
  {id:'V3B_703_BUILD_180',bikeId:'V3P_BIKE_090',runId:'V3P_RUN_041',phase:'build',transitionSeconds:360},
  {id:'V3B_703_BUILD_120',bikeId:'V3P_BIKE_057',runId:'V3P_RUN_041',phase:'build',transitionSeconds:240},
  {id:'V3B_703_PEAK_150', bikeId:'V3P_BIKE_085',runId:'V3P_RUN_041',phase:'peak',transitionSeconds:540},
] as const;

export type V32BrickId=typeof V32_703_BRICK_BLUEPRINTS[number]['id'];
export interface V32SpecificBrickReview {
  id:V32BrickId;
  objective:string;
  individualCoachApproval:true;
  /** The exact transition time must be reviewed, no unspecified time. */
  transitionSeconds:number;
  preferReviewedV3?:true;
}
export interface V32SpecificBrickReport {
  accepted:RepairWorkoutMetadata[];
  rejected:{id:string;reason:string}[];
}
export function composeReviewedV32SpecificBricks(
  reviewedSources:readonly RepairWorkoutMetadata[],
  reviews:readonly V32SpecificBrickReview[],
):V32SpecificBrickReport {
  const accepted:RepairWorkoutMetadata[]=[], rejected:V32SpecificBrickReport['rejected']=[];
  const sources=new Map(reviewedSources.map(s=>[s.id,s]));
  const seen=new Set<string>();
  for(const review of reviews){
    const refuse=(reason:string)=>rejected.push({id:review.id,reason});
    if(seen.has(review.id)){refuse('v32_duplicate_brick_review');continue;}
    seen.add(review.id);
    const blueprint=V32_703_BRICK_BLUEPRINTS.find(x=>x.id===review.id);
    if(!blueprint||review.individualCoachApproval!==true){
      refuse('v32_brick_review_or_blueprint_missing');continue;
    }
    if(normalizeRepairGoal(review.objective)!=='half'){
      refuse('v32_brick_objective_not_half');continue;
    }
    if(!Number.isSafeInteger(review.transitionSeconds)||
       review.transitionSeconds!==blueprint.transitionSeconds){
      refuse('v32_transition_not_reviewed_blueprint');continue;
    }
    const bike=sources.get(blueprint.bikeId),run=sources.get(blueprint.runId);
    if(!isCompleteRepairWorkoutMetadata(bike)||!isCompleteRepairWorkoutMetadata(run)){
      refuse('v32_both_components_must_be_individually_reviewed');continue;
    }
    if(bike.sport!=='bike'||run.sport!=='run'||!bike.goals.includes('half')||!run.goals.includes('half')||
       bike.intentFamily!=='race_pace'||run.intentFamily!=='race_pace'){
      refuse('v32_component_goal_sport_or_intent_mismatch');continue;
    }
    if(!bike.phases.includes(blueprint.phase)||!run.phases.includes(blueprint.phase)){
      refuse('v32_component_phase_not_verified');continue;
    }
    if(bike.durationMin[0]!==bike.durationMin[1]||run.durationMin[0]!==run.durationMin[1]||
       !Number.isSafeInteger(bike.durationMin[0])||!Number.isSafeInteger(run.durationMin[0])){
      refuse('v32_component_duration_unresolved');continue;
    }
    const bikeMin=bike.durationMin[0],runMin=run.durationMin[0],transitionMin=review.transitionSeconds/60;
    const total=bikeMin+transitionMin+runMin;
    // These three blueprints require source baselines; changing even easy
    // components can change the endurance/quality balance of the combined
    // stimulus and needs a new individually reviewed blueprint.
    const plannedTotal=Number(blueprint.id.split('_').slice(-1)[0]);
    if(!Number.isSafeInteger(total)||total!==plannedTotal||
       bikeMin<=0||runMin<=0||total>180){
      refuse('v32_exact_blueprint_dose_mismatch');continue;
    }
    const structure=[
      'Vélo '+bikeMin+' min : '+bike.structure,
      'Transition '+transitionMin+' min (confirmée par le coach, hors exercice)',
      'Course '+runMin+' min : '+run.structure,
      'Total exact '+total+' min, intensités et récupérations des deux sources préservées',
    ].join(' | ');
    const meta:RepairWorkoutMetadata={
      metadataVersion:1,complete:true,
      id:blueprint.id,sport:'brick',
      title:'70.3 '+blueprint.phase+' — '+bike.title+' puis '+run.title,
      objective:'Enchaînement contrôlé vélo/course en phase '+blueprint.phase,
      intentFamily:'brick',goals:['half'],objectiveSpecific:true,
      phases:[blueprint.phase],durationMin:[total,total],
      mainZoneMax:Math.max(bike.mainZoneMax,run.mainZoneMax),
      specialContext:null,prerequisiteKeys:[],necessity:'Optionnel',
      when:blueprint.phase+', récupération et tolérance vérifiées individuellement',
      avoid:bike.avoid+' · '+run.avoid,
      tags:['v3-v32-experimental-composition','two-reviewed-components',
        'bike-source:'+bike.id,'run-source:'+run.id],
      structure,zones:[...new Set([...bike.zones,...run.zones])],variants:{},
    };
    if(!isCompleteRepairWorkoutMetadata(meta)){
      refuse('v32_brick_metadata_incomplete');continue;
    }
    accepted.push(meta);
  }
  return {accepted,rejected};
}
