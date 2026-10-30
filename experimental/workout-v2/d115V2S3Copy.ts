/**
 * D1.15: real (but synthetic) S3 copy-edit with exact, structured V2 alternatives.
 * This is NOT an individual prescription, a replacement for V1, or production.
 * No athlete anchor is fabricated: only low-intensity RPE V2 recipes are tried.
 */
import type {ParsedPlan,ParsedSession} from "@/lib/aiPlanParser";
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {D12_PROFILES,projectD12Profile} from "./d12Projection";
import type {D12Profile} from "./d12CohortAudit";
import {fitWorkoutV2ToDuration} from "./fit";
import {previewV2InPlan,type PlanV2Preview} from "./planBridge";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
import {examineD110TimeRatio,type D110Decision} from "./d110TimeRatioFeasibility";
import {nativeChecks,type D18Issue} from "./d18ReplacementReview";

type Changed={day:string;sport:string;oldId:string;newModelId:string;oldMinutes:number;newMinutes:number;steps:PlanV2Preview["exactSteps"]};
const critical=(a:readonly D18Issue[])=>a.filter(i=>["error","critical","blocking"].includes(i.severity));
const issueKey=(i:D18Issue)=>[i.week??"global",i.code,i.message??"",i.severity].join("|");
export type D115Result =
 | {status:"blocked";profile:D12Profile;reasons:string[];sportsApproved:false;canPublish:false;canPersist:false;canExport:false}
 | {status:"copy_edited_native_revalidated";profile:D12Profile;
    editedPlan:ParsedPlan;changes:Changed[];
    beforeRatio:D110Decision;afterRatio:D110Decision;nativeBefore:D18Issue[];nativeAfter:D18Issue[];
    introducedCritical:D18Issue[];remainingCritical:D18Issue[];
    originalCalendarUnchanged:true;structuredV2NotEquivalentToV1:true;
    syntheticReadinessOnly:true; sportsApproved:false;canPublish:false;canPersist:false;canExport:false};
const blocked=(profile:D12Profile,reason:string):D115Result=>({
 status:"blocked",profile,reasons:[reason],sportsApproved:false,
 canPublish:false,canPersist:false,canExport:false,
});
const sportRows=(plan:ParsedPlan)=>plan.weeks.filter(w=>w.weekNumber===3)
 .flatMap(w=>w.sessions.filter(s=>!s.isRest).map(s=>({sport:s.sport,id:s.catalogId??null,minutes:s.durationMin??0})));
const ratio=(plan:ParsedPlan)=>{
 const proof=attachD110SourceBrickProof(sportRows(plan));
 if(proof.ok===false)return null;
 return examineD110TimeRatio(proof.sessions,3);
};
const sum=(plan:ParsedPlan)=>plan.weeks.flatMap(w=>w.sessions)
 .filter(s=>!s.isRest).reduce((n,s)=>n+(s.durationMin??0),0);
const modelFor=(sport:string)=>sport==="bike"?"V2_BIKE_01":"V2_RUN_02";
function fitted(source:ParsedSession,minutes:number):PlanV2Preview|null{
 const model=modelFor(source.sport);
 const fit=fitWorkoutV2ToDuration(model,{
  goal:"half",phase:"base",level:"trained",readiness:"ready",
  pain:false,recoveryConcern:false,maxDurationSec:minutes*60,
 },minutes*60);
 if(fit.ok===false)return null;
 const preview=previewV2InPlan(fit.candidate,source.dayName as Parameters<typeof previewV2InPlan>[1]);
 if(preview.ok===false || preview.preview.plannedDurationSec!==minutes*60||
    preview.preview.canAutoInsert!==false || preview.preview.canExportNolio!==false ||
    preview.preview.planSession.catalogId!==null||preview.preview.planSession.custom!==true)
    return null;
 return preview.preview;
}
export function examineD115V2S3Copy(profile:D12Profile):D115Result{
 const originalBuild=projectD12Profile(profile,[],true);
 const original=originalBuild.candidatePlan;
 if(originalBuild.status!=="candidate"||!original||original.weeks.length!==4)
  return blocked(profile,"original_D1_candidate_missing");
 const before=ratio(original);
 if(!before)return blocked(profile,"source_brick_components_not_verified");
 if(before.status==="fully_accounted_inside_bands")
  return blocked(profile,"already_inside_hypothetical_bands_no_edit_necessary");
 const week=original.weeks.find(w=>w.weekNumber===3);
 if(!week)return blocked(profile,"week3_not_found");
 // Conservative: no target physiological category/key/intensity is overwritten.
 const candidates=week.sessions.filter(s=>!s.isRest&&!s.isKeySession&&
  (s.sport==="bike"||s.sport==="run")&&s.custom!==true&&
  !!s.catalogId&&!!WorkoutLibrary.find(x=>x.id===s.catalogId&&x.cat==="A"));
 const donors=candidates.filter(s=>s.sport==="bike");
 const receivers=candidates.filter(s=>s.sport==="run");
 if(!donors.length||!receivers.length)return blocked(profile,"no_nonkey_A_bike_run_pair");
 // Search minimum whole-minute transfer first: only ONE pair and two V2 steady
 // models. No proof of global infeasibility if this bounded search fails.
 for(let delta=1;delta<=60;delta++){
  for(const donor of donors)for(const receiver of receivers){
   const b=(donor.durationMin??0)-delta,r=(receiver.durationMin??0)+delta;
   if(b<=0||r<=0)continue;
   const bV2=fitted(donor,b),rV2=fitted(receiver,r);
   if(!bV2||!rV2)continue;
   const clone=structuredClone(original);
   const targetWeek=clone.weeks.find(w=>w.weekNumber===3);
   if(!targetWeek)return blocked(profile,"clone_week_missing");
   const edits=[{source:donor,preview:bV2},{source:receiver,preview:rV2}];
   const changes:Changed[]=[];
   let valid=true;
   for(const edit of edits){
    const index=targetWeek.sessions.findIndex(s=>!s.isRest &&
     s.dayIndex===edit.source.dayIndex&&s.sport===edit.source.sport&&
     s.catalogId===edit.source.catalogId&&s.durationMin===edit.source.durationMin);
    if(index<0){valid=false;break;}
    const existing=targetWeek.sessions[index];
    const p=edit.preview.planSession;
    targetWeek.sessions[index]={...existing,title:p.title,details:p.details,
     durationMin:p.durationMin,catalogId:null,custom:true,isKeySession:false,zones:[]};
    changes.push({day:existing.dayName,sport:existing.sport,oldId:existing.catalogId!,
     newModelId:edit.preview.modelId,oldMinutes:existing.durationMin!,
     newMinutes:p.durationMin,steps:edit.preview.exactSteps});
   }
   if(!valid||sum(original)!==sum(clone))continue;
   const after=ratio(clone);
   if(!after||after.status!=="fully_accounted_inside_bands")continue;
   const nativeBefore=nativeChecks(original,profile);
   const nativeAfter=nativeChecks(clone,profile);
   const known=new Set(critical(nativeBefore).map(issueKey));
   return {status:"copy_edited_native_revalidated",profile,editedPlan:clone,
    changes,beforeRatio:before,afterRatio:after,
    nativeBefore,nativeAfter,remainingCritical:critical(nativeAfter),
    introducedCritical:critical(nativeAfter).filter(i=>!known.has(issueKey(i))),
    originalCalendarUnchanged:true,structuredV2NotEquivalentToV1:true,
    syntheticReadinessOnly:true,sportsApproved:false,canPublish:false,
    canPersist:false,canExport:false};
  }
 }
 return blocked(profile,"no_nonkey_A_pair_fits_two_exact_V2_recipes_not_global_impossibility");
}
export function examineD115Cohort():D115Result[]{
 return D12_PROFILES.map(profile=>examineD115V2S3Copy(profile));
}
