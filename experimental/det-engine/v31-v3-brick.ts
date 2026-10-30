/**
 * One explicitly reviewed aerobic 70.3 brick in BASE from existing V3 sources,
 * with exact duration recomputed from bounded, individually configured components.
 * This is an EXPERIMENTAL COMPOSITION, not a 401st single-sport source or a
 * scientifically validated session. No automatic release or catalogue rewrite.
 */
import {
  isCompleteRepairWorkoutMetadata, normalizeRepairGoal,
  type RepairWorkoutMetadata,
} from '../../supabase/functions/_shared/repairSportingEquivalence';

export const V3_BASE_BRICK_ID='V3B_703_BASE_001' as const;
const BLUEPRINT={id:V3_BASE_BRICK_ID,bikeId:'V3P_BIKE_002',runId:'V3P_RUN_001'};

export interface V3BaseBrickReview {
  id:typeof V3_BASE_BRICK_ID;
  objective:string;
  individualCoachApproval:true;
  /** Athlete-specific, verified transition assumption. Allowed 3-10 minutes. */
  transitionSeconds:number;
  /** Authorize preference only after the regular sporting and duration gates. */
  preferReviewedV3?:true;
}

export interface V3BrickReport {
  accepted:RepairWorkoutMetadata[];
  rejected:{id:string;reason:string}[];
}

export function composeReviewedV3BaseBricks(
  reviewedSources:readonly RepairWorkoutMetadata[],
  reviews:readonly V3BaseBrickReview[],
):V3BrickReport {
  const accepted:RepairWorkoutMetadata[]=[];
  const rejected:V3BrickReport['rejected']=[];
  const seen=new Set<string>();
  const sources=new Map(reviewedSources.map(source=>[source.id,source]));
  for(const r of reviews){
    const refuse=(reason:string)=>rejected.push({id:r.id,reason});
    if(seen.has(r.id)){refuse('brick_duplicate_review_id');continue;}
    seen.add(r.id);
    if(r.id!==BLUEPRINT.id||r.individualCoachApproval!==true){
      refuse('brick_not_individually_approved');continue;
    }
    if(normalizeRepairGoal(r.objective)!=='half'){
      refuse('brick_incompatible_race_objective');continue;
    }
    if(!Number.isSafeInteger(r.transitionSeconds)||r.transitionSeconds<180||
       r.transitionSeconds>600||r.transitionSeconds%60!==0){
      refuse('brick_transition_not_exact_or_out_of_bounds');continue;
    }
    const bike=sources.get(BLUEPRINT.bikeId),run=sources.get(BLUEPRINT.runId);
    if(!bike||!run||!isCompleteRepairWorkoutMetadata(bike)||!isCompleteRepairWorkoutMetadata(run)){
      refuse('brick_component_individual_review_missing');continue;
    }
    if(bike.sport!=='bike'||run.sport!=='run'||!bike.goals.includes('half')||!run.goals.includes('half')){
      refuse('brick_component_goal_or_sport_mismatch');continue;
    }
    const phases=bike.phases.filter(p=>run.phases.includes(p)&&p==='base');
    if(phases.length!==1){refuse('brick_base_phase_not_documented');continue;}
    if(bike.durationMin[0]!==bike.durationMin[1]||
       run.durationMin[0]!==run.durationMin[1]||
       !Number.isSafeInteger(bike.durationMin[0])||!Number.isSafeInteger(run.durationMin[0])){
      refuse('brick_source_execution_not_exact');continue;
    }
    const bikeMin=bike.durationMin[0],runMin=run.durationMin[0];
    const transitionMin=r.transitionSeconds/60,total=bikeMin+transitionMin+runMin;
    if(!Number.isSafeInteger(total)||total<=0){
      refuse('brick_total_not_exact');continue;
    }
    const structure=[
      'Vélo '+bikeMin+' min : '+bike.structure,
      'Transition '+transitionMin+' min, validée par le coach (pas un entraînement)',
      'Course '+runMin+' min : '+run.structure,
      'Total exact '+total+' min. Ne pas raccourcir un composant sans nouvelle revue.',
    ].join(' | ');
    const metadata:RepairWorkoutMetadata={
      metadataVersion:1,complete:true,id:BLUEPRINT.id,sport:'brick',
      title:'70.3 base — vélo LT1 + transition + course aisée',
      objective:'Transition contrôlée en base après travail aérobie vélo, sans ajout de fraction intense',
      intentFamily:'brick',goals:['half'],objectiveSpecific:true,phases,
      durationMin:[total,total],mainZoneMax:Math.max(bike.mainZoneMax,run.mainZoneMax),
      specialContext:null,prerequisiteKeys:[],necessity:'Optionnel',
      when:'base, récupération compatible et deux sous-séances autorisées',
      avoid:bike.avoid+' · '+run.avoid,
      tags:['v3-brick-composition-candidate','two-reviewed-components',bike.id,run.id],
      structure,zones:[...new Set([...bike.zones,...run.zones])],variants:{},
    };
    if(!isCompleteRepairWorkoutMetadata(metadata)){
      refuse('brick_generated_metadata_invalid');continue;
    }
    accepted.push(metadata);
  }
  return {accepted,rejected};
}