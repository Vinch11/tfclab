/**
 * DET V34 — 70.3 bike-focused brick candidates with an EASY transition run.
 * The preceding V32 bricks contain a 36h-recovery tempo run, and therefore
 * conflict with next-day Sunday running without extraordinary clock times.
 *
 * Candidate source compositions ONLY. Nothing is coach-approved automatically.
 */
import {
  isCompleteRepairWorkoutMetadata, normalizeRepairGoal,
  type RepairWorkoutMetadata,
} from '../../supabase/functions/_shared/repairSportingEquivalence';

export const V34_SAFE_RUN_BRICKS=[
  {id:'V3B_703_BUILD_EASY_173',bikeId:'V3P_BIKE_090',runId:'V3P_RUN_001',
    phase:'build',bikeMin:132,runMin:35,transitionSeconds:360,totalMin:173},
  {id:'V3B_703_BUILD_EASY_120',bikeId:'V3P_BIKE_017',runId:'V3P_RUN_001',
    phase:'build',bikeMin:77,runMin:35,transitionSeconds:480,totalMin:120},
  {id:'V3B_703_PEAK_EASY_160',bikeId:'V3P_BIKE_089',runId:'V3P_RUN_001',
    phase:'peak',bikeMin:120,runMin:35,transitionSeconds:300,totalMin:160},
] as const;
export type V34SafeBrickId=typeof V34_SAFE_RUN_BRICKS[number]['id'];
export interface V34SafeBrickReview {
  id:V34SafeBrickId;objective:string;individualCoachApproval:true;
  transitionSeconds:number;
  preferReviewedV3?:true;
}
export function composeReviewedV34EasyRunBricks(
  reviewedSources:readonly RepairWorkoutMetadata[],reviews:readonly V34SafeBrickReview[],
):{accepted:RepairWorkoutMetadata[];rejected:{id:string;reason:string}[]} {
  const accepted:RepairWorkoutMetadata[]=[],rejected:{id:string;reason:string}[]=[];
  const byId=new Map(reviewedSources.map(x=>[x.id,x]));
  const seen=new Set<string>();
  for(const r of reviews){
    const reject=(reason:string)=>rejected.push({id:r.id,reason});
    if(seen.has(r.id)){reject('v34_duplicate_brick_approval');continue;}
    seen.add(r.id);
    const recipe=V34_SAFE_RUN_BRICKS.find(x=>x.id===r.id);
    if(!recipe||r.individualCoachApproval!==true){reject('v34_unknown_or_unapproved_recipe');continue;}
    if(normalizeRepairGoal(r.objective)!=='half'){reject('v34_wrong_race_objective');continue;}
    if(r.transitionSeconds!==recipe.transitionSeconds){
      reject('v34_transition_dose_not_verified');continue;
    }
    const bike=byId.get(recipe.bikeId),run=byId.get(recipe.runId);
    if(!isCompleteRepairWorkoutMetadata(bike)||!isCompleteRepairWorkoutMetadata(run)){
      reject('v34_both_sources_require_individual_review');continue;
    }
    if(bike.sport!=='bike'||run.sport!=='run'||
       !bike.goals.includes('half')||!run.goals.includes('half')||
       !['race_pace','endurance_fondamentale'].includes(bike.intentFamily)||
       !['recuperation','endurance_fondamentale'].includes(run.intentFamily)||
       run.mainZoneMax>2){
      reject('v34_aerobic_run_or_source_contract_unproven');continue;
    }
    if(!bike.phases.includes(recipe.phase)||!run.phases.includes(recipe.phase)){
      reject('v34_phase_incompatible');continue;
    }
    if(bike.durationMin[0]!==recipe.bikeMin||bike.durationMin[1]!==recipe.bikeMin||
       run.durationMin[0]!==recipe.runMin||run.durationMin[1]!==recipe.runMin){
      reject('v34_exact_component_doses_not_preserved');continue;
    }
    const transitionMin=recipe.transitionSeconds/60;
    const minutes=recipe.bikeMin+recipe.runMin+transitionMin;
    if(!Number.isSafeInteger(minutes)||minutes!==recipe.totalMin){
      reject('v34_total_duration_inconsistent');continue;
    }
    const structure=[
      'Vélo '+recipe.bikeMin+' min : '+bike.structure,
      'Transition '+transitionMin+' min, revue individuellement, hors entraînement',
      'Course '+recipe.runMin+' min : '+run.structure,
      'Total exact '+minutes+' min. Course facile après vélo, pas de course seuil ajoutée.',
    ].join(' | ');
    const meta:RepairWorkoutMetadata={
      metadataVersion:1,complete:true,id:recipe.id,sport:'brick',
      title:'70.3 '+recipe.phase+' vélo contrôlé + transition course aisée',
      objective:'Vélo spécifique ou endurance puis course facile, préserver qualité du dimanche',
      intentFamily:'brick',goals:['half'],objectiveSpecific:true,
      phases:[recipe.phase],durationMin:[minutes,minutes],
      mainZoneMax:Math.max(bike.mainZoneMax,run.mainZoneMax),
      specialContext:null,prerequisiteKeys:[],necessity:'Optionnel',
      when:recipe.phase+', source reviews et récupération vérifiées',
      avoid:bike.avoid+' · '+run.avoid,
      tags:['v3-v34-low-run-composition','two-reviewed-components',
        'bike-source:'+bike.id,'run-source:'+run.id],
      structure,zones:[...new Set([...bike.zones,...run.zones])],variants:{},
    };
    if(!isCompleteRepairWorkoutMetadata(meta)){
      reject('v34_assembly_metadata_invalid');continue;
    }
    accepted.push(meta);
  }
  return {accepted,rejected};
}
