/**
 * DET V3.55 — source-backed TTE candidate preference, never an eligibility
 * or validation exception. A title, generic "durability" tag or unknown dose
 * can never earn priority. Opt-in experimental only.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {verifyReviewedTteThresholdDose} from './v353-reviewed-tte-dose';

export interface ReviewedTtePriorityProof {
  exactDose:(id:string,durationMin:number)=>StructuredZoneDose|null|undefined;
  limiterKeys:(id:string)=>readonly string[]|null|undefined;
  primaryDomain:(id:string)=>string|null|undefined;
}
export function isVerifiedTtePriorityCandidate(
  session:ParsedSession,config:{
    enabled:boolean;primaryLimiterIsTte:boolean;weekType:string|undefined;
  },proof:ReviewedTtePriorityProof,
):boolean {
  if(!config.enabled||!config.primaryLimiterIsTte||config.weekType!=='load'||
     !session.isKeySession||session.sport!=='run'||session.isRest||
     typeof session.catalogId!=='string'||
     typeof session.durationMin!=='number'||!Number.isFinite(session.durationMin)||
     session.durationMin<=0)return false;
  try{
    return verifyReviewedTteThresholdDose({
      sourceId:session.catalogId,durationMin:session.durationMin,
      dose:proof.exactDose(session.catalogId,session.durationMin),
      sourceLimiterKeys:proof.limiterKeys(session.catalogId),
      sourcePrimaryDomain:proof.primaryDomain(session.catalogId),
    }).verified;
  }catch{
    return false;
  }
}
