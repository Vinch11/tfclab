/** Whole-plan proposal acceptance. Raw rejected plans remain evidence; no validator output is rewritten. */
import type{ParsedPlan}from'@/lib/aiPlanParser';import type{V2Issue}from'./v2-validation';import{noNewCritical}from'./v2-validation';
import{assessRepairQuality,warningDeltas}from'./v3-quality';import{compareGlobalCorrection,type ExposureDose}from'./v4-progression';
interface Proposal{status?:string;candidate?:ParsedPlan;issues?:V2Issue[];ledger?:ExposureDose[];technical?:{valid:boolean|null};}
export function selectWholePlanProposal<T extends Proposal>(previous:T|undefined,next:T){
 if(!previous?.candidate)return{selected:next,acceptedCorrection:false,decision:next.candidate?'new_unvalidated_candidate':'explicit_refusal',requiresHumanReview:true};
 if(!next.candidate)return{selected:previous,acceptedCorrection:false,decision:'construction_regression_rejected',requiresHumanReview:true};
 const oldIssues=previous.issues??[],newIssues=next.issues??[];
 const quality=assessRepairQuality(oldIssues,newIssues,previous.candidate,next.candidate),global=compareGlobalCorrection(previous.candidate,next.candidate,previous.ledger,next.ledger);
 const critical=(issues:V2Issue[])=>issues.filter(i=>['error','critical','blocking'].includes(i.severity)).length;
 const improvement=critical(newIssues)<critical(oldIssues)||warningDeltas(oldIssues,newIssues).some(d=>d.delta<0);
 const accepted=next.technical?.valid===true&&noNewCritical(oldIssues,newIssues)&&quality.accepted&&global.accepted&&improvement;
 return{selected:accepted?next:previous,acceptedCorrection:accepted,decision:accepted?'whole_plan_improvement_accepted':'no_safe_demonstrated_whole_plan_improvement',
  quality,global:{accepted:global.accepted,increases:global.increases,firstWeekIncrease:global.firstWeekIncrease},noNewCritical:noNewCritical(oldIssues,newIssues),requiresHumanReview:true};
}
