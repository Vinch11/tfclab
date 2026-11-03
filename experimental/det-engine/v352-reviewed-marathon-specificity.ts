/**
 * DET V3.52 — narrow reconciliation of ONE lexical marathon-specificity
 * warning with exact, athlete-reviewed V3 source blocks.
 * The native issue remains in the audit. Any other phase warning is retained.
 * A source name/intent alone, a zero Z4 dose or a mismatched goal is refused.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {verifyReviewedRunningRaceSpecific,type ReviewedRunningSpecificSource,type RunningSpecificObjective}
  from './v335-reviewed-run-specificity';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

type NativeIssue={code:string;week?:number;severity:string;message?:string};
const FALSE_NEGATIVE='Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée';
export interface ReviewedMarathonSpecificityReconciliation {
  verified:boolean;
  issues:NativeIssue[];
  originalNativeIssues:NativeIssue[];
  sourceEvidence:readonly {week:number;sourceId:string;durationMin:number;highMin:number}[];
  reconciledNativeFindings:NativeIssue[];
  nativeIssuesPreservedInAudit:true;
  otherNativeGatesUnchanged:true;
  scientificAttestation:false;
}
/** A single bounded, source-driven correction — not a generic phase exemption. */
export function reconcileReviewedMarathonSpecificity(
  plan:Pick<ParsedPlan,'weeks'>,nativeIssues:readonly NativeIssue[],
  approved:(id:string)=>ReviewedRunningSpecificSource|null|undefined,
  exactDose:(id:string,durationMin:number)=>StructuredZoneDose|null|undefined,
  objective:RunningSpecificObjective='marathon',
):ReviewedMarathonSpecificityReconciliation {
  const evidence:{week:number;sourceId:string;durationMin:number;highMin:number}[]=[];
  for(const week of plan.weeks){
    if(week.phase?.trim().toLowerCase()!=='peak')continue;
    for(const session of week.sessions){
      const verdict=verifyReviewedRunningRaceSpecific(session,objective,approved,exactDose);
      if(verdict.verified)evidence.push({week:week.weekNumber,sourceId:verdict.sourceId,
        durationMin:verdict.durationMin,highMin:verdict.highMin});
    }
  }
  const suppressible=nativeIssues.filter(i=>i.code==='phase_coherence'&&
    i.severity==='warning'&&i.message?.startsWith(FALSE_NEGATIVE));
  const verified=evidence.length>0&&suppressible.length===1;
  const rest=verified?
    nativeIssues.filter(i=>i!==suppressible[0]):[...nativeIssues];
  return {verified,issues:rest,originalNativeIssues:[...nativeIssues],
    sourceEvidence:evidence,reconciledNativeFindings:verified?suppressible:[],
    nativeIssuesPreservedInAudit:true,otherNativeGatesUnchanged:true,
    scientificAttestation:false};
}

/** Shared mechanism; the historical marathon entry point retains its default. */
export {reconcileReviewedMarathonSpecificity as reconcileReviewedRunningSpecificity};
