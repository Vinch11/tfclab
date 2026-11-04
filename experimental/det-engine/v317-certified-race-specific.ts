/**
 * Experimental DET V3.17: independently reviewed V3 race-pace evidence.
 * A text regex, an ordinary tempo card, or a brick alone cannot establish
 * 70.3/IM race-specific training. The source and its exact individual dose
 * must both be available, under an approved goal-compatible review.
 */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {NativeZoneDose} from './v39-strict-native-polarization-target';

export type TriObjective='703'|'IM'|'Sprint'|'Olympic';
export type EnduranceSpecificObjective=TriObjective|'Cycling'|'Swimming';
export type ProvenRaceSource={sourceId:string;objective:EnduranceSpecificObjective};
export type ReviewedBrickComponents={sourceId:string;transitionSeconds:number;components:{sourceId:string;sport:'bike'|'run';durationMin:number}[]};
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
  plan:ParsedPlan,objective:EnduranceSpecificObjective,
  approved:(id:string)=>ProvenRaceSource|null|undefined,
  sourceDose:(id:string,durationMin:number)=>NativeZoneDose|null|undefined,
  brickComponents?:(id:string)=>ReviewedBrickComponents|null|undefined,
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
  // Unavailable proof providers invalidate the whole certificate, even
  // when a different session has individually verified race-pace evidence.
  let providerUnavailable=false;
  let invalidReviewedEvidence=false;
  for(const w of peak){
    const evidenceSessions:ParsedSession[]=[];
    for(const session of w.sessions as ParsedSession[]){
      if(session.sport!=='brick'||!session.catalogId||!brickComponents){evidenceSessions.push(session);continue;}
      let composition:ReviewedBrickComponents|null|undefined;
      try{composition=brickComponents(session.catalogId);}catch{providerUnavailable=true;continue;}
      if(!composition){evidenceSessions.push(session);continue;}
      const parts=composition.components;
      if(composition.sourceId!==session.catalogId||parts.length!==2||new Set(parts.map(p=>p.sourceId)).size!==2||
         !parts.some(p=>p.sport==='bike')||!parts.some(p=>p.sport==='run')||
         parts.some(p=>!new RegExp('^V3P_'+(p.sport==='bike'?'BIKE':'RUN')+'_\\d{3}$').test(p.sourceId))||
         parts.some(p=>p.sourceId===session.catalogId||!Number.isFinite(p.durationMin)||p.durationMin<=0)||
         !Number.isSafeInteger(composition.transitionSeconds)||composition.transitionSeconds<180||composition.transitionSeconds>600||
         typeof session.durationMin!=='number'||Math.abs(parts.reduce((n,p)=>n+p.durationMin,0)+composition.transitionSeconds/60-session.durationMin)>1e-7){
        invalidReviewedEvidence=true;rejected.push('invalid_reviewed_brick_components:'+session.catalogId);continue;
      }
      // Proof projection only: source IDs and exact admitted component doses,
      // never a new workout or a rewrite of the saved composite session.
      for(const part of parts)evidenceSessions.push({...session,catalogId:part.sourceId,sport:part.sport,durationMin:part.durationMin});
    }
    for(const session of evidenceSessions){
      if(session.isRest||!session.catalogId)continue;
      let review:ProvenRaceSource|null|undefined;
      try{review=approved(session.catalogId);}
      catch{
        providerUnavailable=true;
        rejected.push('source_review_provider_error:'+session.catalogId);
        continue;
      }
      if(!review)continue;
      if(review.sourceId!==session.catalogId||review.objective!==objective){
        invalidReviewedEvidence=true;
        rejected.push('wrong_source_or_objective:'+session.catalogId);continue;
      }
      if(!['bike','swim','run'].includes(session.sport)){
        invalidReviewedEvidence=true;
        rejected.push('wrong_sport:'+session.catalogId);continue;
      }
      let dose:NativeZoneDose|null|undefined;
      if(typeof session.durationMin==='number'){
        try{dose=sourceDose(session.catalogId,session.durationMin);}
        catch{
          providerUnavailable=true;
          rejected.push('source_dose_provider_error:'+session.catalogId);
          continue;
        }
      }
      if(typeof session.durationMin!=='number'||
         !zonesValid(dose,session.durationMin)){
        invalidReviewedEvidence=true;
        rejected.push('missing_exact_individual_dose:'+session.catalogId);
        continue;
      }
      sourceIds.add(session.catalogId);
    }
  }
  if(providerUnavailable)return refuse('race_specific_evidence_provider_unavailable',rejected);
  // A valid source must not mask a different reviewed source with the wrong
  // objective, sport, or non-conserved individual dose in the same peak.
  if(invalidReviewedEvidence)return refuse('race_specific_reviewed_source_invalid',rejected);
  if(!sourceIds.size)return refuse('no_individually_approved_race_pace_source_in_peak',rejected);
  return {verdict:'verified',reason:'approved_goal_specific_source_and_exact_dose_in_peak',
    sourceIds:[...sourceIds].sort(),peakWeeks:peak.map(w=>w.weekNumber),
    rejected,scientificAttestation:false};
}
