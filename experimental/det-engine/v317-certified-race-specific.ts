/**
 * Experimental DET V3.17: independently reviewed V3 race-pace evidence.
 * A text regex, an ordinary tempo card, or a brick alone cannot establish
 * 70.3/IM race-specific training. The source and its exact individual dose
 * must both be available, under an approved goal-compatible review.
 */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {NativeZoneDose} from './v39-strict-native-polarization-target';

export type TriObjective='703'|'IM';
export type ProvenRaceSource={sourceId:string;objective:TriObjective};
export interface ReviewedRaceSpecificProof{
  verdict:'verified'|'refused';
  reason:string;
  sourceIds:string[];
  peakWeeks:number[];
  rejected:string[];
  scientificAttestation:false;
}
const zonesValid=(dose:NativeZoneDose|null|undefined,minutes:number)=>
  !!dose&&Number.isFinite(minutes)&&minutes>0&&
  [dose.low,dose.nonLow,dose.unknown].every(x=>Number.isFinite(x)&&x>=0)&&
  Math.abs(dose.low+dose.nonLow+dose.unknown-minutes)<=1e-7;
const isPeak=(phase:string)=>phase.trim().toLowerCase()==='peak';

export function certifyReviewedRaceSpecificPeak(
  plan:ParsedPlan,objective:TriObjective,
  approved:(id:string)=>ProvenRaceSource|null|undefined,
  sourceDose:(id:string,durationMin:number)=>NativeZoneDose|null|undefined,
):ReviewedRaceSpecificProof{
  const refuse=(reason:string,rejected:string[]=[])=>({
    verdict:'refused' as const,reason,sourceIds:[],peakWeeks:[],
    rejected,scientificAttestation:false as const,
  });
  if(!Array.isArray(plan.weeks)||!plan.weeks.length)
    return refuse('missing_calendar');
  const peak=plan.weeks.filter(w=>isPeak(w.phase??''));
  if(!peak.length)return refuse('race_specific_peak_phase_missing');
  const sourceIds=new Set<string>();
  const rejected:string[]=[];
  for(const w of peak){
    for(const session of w.sessions as ParsedSession[]){
      if(session.isRest||!session.catalogId)continue;
      let review:ProvenRaceSource|null|undefined;
      try{review=approved(session.catalogId);}
      catch{
        rejected.push('source_review_provider_error:'+session.catalogId);
        continue;
      }
      if(!review)continue;
      if(review.sourceId!==session.catalogId||review.objective!==objective){
        rejected.push('wrong_source_or_objective:'+session.catalogId);continue;
      }
      if(!['bike','swim','run'].includes(session.sport)){
        rejected.push('wrong_sport:'+session.catalogId);continue;
      }
      let dose:NativeZoneDose|null|undefined;
      if(typeof session.durationMin==='number'){
        try{dose=sourceDose(session.catalogId,session.durationMin);}
        catch{rejected.push('source_dose_provider_error:'+session.catalogId);continue;}
      }
      if(typeof session.durationMin!=='number'||
         !zonesValid(dose,session.durationMin)){
        rejected.push('missing_exact_individual_dose:'+session.catalogId);
        continue;
      }
      sourceIds.add(session.catalogId);
    }
  }
  if(!sourceIds.size)return refuse('no_individually_approved_race_pace_source_in_peak',rejected);
  return {verdict:'verified',reason:'approved_goal_specific_source_and_exact_dose_in_peak',
    sourceIds:[...sourceIds].sort(),peakWeeks:peak.map(w=>w.weekNumber),
    rejected,scientificAttestation:false};
}
