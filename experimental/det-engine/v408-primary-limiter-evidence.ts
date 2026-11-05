import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {detPrimaryLimiterKey} from './v403-limiter-semantics';
/** Source-bound prescription evidence; never a measured physiological adaptation. */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {DetLimiterKey} from './v403-limiter-semantics';
import {matchingStructuredDose,type StructuredZoneDose} from './v310-structured-zone-dose';
import {verifyReviewedTteThresholdDose} from './v353-reviewed-tte-dose';
export interface PrimarySourceEvidence {
 dose:(id:string,min:number)=>StructuredZoneDose|null|undefined;
 limiterKeys:(id:string)=>readonly string[]|null|undefined;
 primaryDomain:(id:string)=>string|null|undefined;
}
export const EXTENDED_RUNNING_PRIMARIES:readonly DetLimiterKey[]=['vo2max','vma_velocity','vlamax_reduction'];
export function verifyPrimaryRunningSession(s:ParsedSession,key:DetLimiterKey,p:PrimarySourceEvidence){
 const no={verified:false,basis:'unverified' as string,scientificAttestation:false as const};
 if(s.isRest||!s.isKeySession||s.sport!=='run'||!s.catalogId||!/^V3P_RUN_\d{3}$/.test(s.catalogId)||!Number.isFinite(s.durationMin))return no;
 const d=matchingStructuredDose(p.dose(s.catalogId,s.durationMin!)??null,s.durationMin!),keys=p.limiterKeys(s.catalogId),domain=p.primaryDomain(s.catalogId);
 if(!d||d.provenance!=='v3_individually_configured_blocks_only'||d.sourceIds.length!==1||d.sourceIds[0]!==s.catalogId||!keys||!domain)return no;
 const threshold=verifyReviewedTteThresholdDose({sourceId:s.catalogId,durationMin:s.durationMin!,dose:d,sourceLimiterKeys:keys,sourcePrimaryDomain:domain}).verified;
 if(key==='tte'||key==='durability_race_relative')return {...no,verified:threshold,basis:threshold?'mlss_exact_20min':'unverified'};
 if(key==='vo2max'||key==='vma_velocity'){
  // Same minimum exact severe work already required by the V360 trail audit.
  const verified=domain==='vo2max'&&keys.includes('aerobic_ceiling')&&keys.includes('severe_domain_tolerance')&&d.high>=8;
  return {...no,verified,basis:verified?(key==='vo2max'?'aerobic_ceiling_exact_8min':'vma_velocity_aerobic_ceiling_exact_8min'):'unverified'};
 }
 if(key==='vlamax_reduction'){
  // Existing app prescription policy: prolonged aerobic work; exact long
  // threshold is a CO-CONTRIBUTOR, never proof of an actual VLamax change.
  const longAerobic=domain==='moderate_lt1'&&keys.includes('aerobic_capacity')&&d.low>=40&&d.high===0&&d.mid===0;
  const verified=longAerobic||threshold;
  return {...no,verified,basis:longAerobic?'long_aerobic_low_40min':threshold?'threshold_co_contributor_exact_20min':'unverified'};
 }
 return no;
}
export function auditPrimaryRunningCoverage(plan:Pick<ParsedPlan,'weeks'>,key:DetLimiterKey,p:PrimarySourceEvidence){
 const keys=plan.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest&&s.isKeySession&&!s.title.startsWith('COURSE : '));
 const decisions=keys.map(s=>({week:s.weekNumber,id:s.catalogId,minutes:s.durationMin,...verifyPrimaryRunningSession(s,key,p)}));
 const hits=decisions.filter(d=>d.verified).length;
 const percentage=keys.length?100*hits/keys.length:null;
 return {verified:percentage!==null&&percentage>=30,primary:key,hits,allKeySessions:keys.length,percentage,minimumPercentage:30,
  // 30% is the app's existing first-rank coverage target, not a new dosage rule.
  decisions,measuredAdaptation:false,scientificAttestation:false};
}

export function primaryRunningInputProblems(config:PlanConfig):string[]{
 if(detPrimaryLimiterKey(config)!=='vlamax_reduction')return [];
 return config.physiologicalTrace?.diagnostic.limiters.some(l=>l.metric==='VLamax'&&typeof l.value==='number'&&typeof l.target==='number'&&l.value>l.target)?[]:['Le diagnostic de l’app ne documente pas une VLamax supérieure à sa cible : la branche de réduction VLamax ne peut pas être utilisée.'];
}
