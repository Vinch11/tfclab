/** D1.15: materialize parametric V2 endurance edits in a CLONE, replay native checks.
 * Experimental synthetic fixtures ONLY. No production call, persistence or export.
 */
import type {ParsedPlan} from "@/lib/aiPlanParser";
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {D12_PROFILES,projectD12Profile} from "./d12Projection";
import type {D12Profile} from "./d12CohortAudit";
import {WORKOUT_V2_MODELS} from "./catalog";
import {fitWorkoutV2ToDuration} from "./fit";
import {previewV2InPlan} from "./planBridge";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
import {examineD110TimeRatio,type D110Decision} from "./d110TimeRatioFeasibility";
import {nativeChecks,type D18Issue} from "./d18ReplacementReview";
import type {DayLower} from "@/lib/plan/planSchema";

type Sport="bike"|"run";
type Choice={minutes:number;modelId:string|null};
type Slot={day:string;sport:string;id:string|null;key:boolean;original:number;options:Choice[]};
type State={cost:number;edits:number;chosen:Choice[]};
const CRITICAL=new Set(["error","critical","blocking"]);
const targetModel:Record<Sport,string>={bike:"V2_BIKE_01",run:"V2_RUN_02"};
const fitInput={goal:"half" as const,phase:"base" as const,level:"trained" as const,
 readiness:"ready" as const,pain:false,recoveryConcern:false};
function slotDomain(source:{day:string;sport:string;id:string|null;minutes:number;key:boolean}):Slot{
 const original=source.minutes,options:Choice[]=[{minutes:original,modelId:null}];
 const slot:Slot={day:source.day,sport:source.sport,id:source.id,key:source.key,original,options};
 if(source.sport!=="bike"&&source.sport!=="run")return slot;
 const card=WorkoutLibrary.find(c=>c.id===source.id);
 if(!card||source.key||card.cat!=="A"||
   (card.physiology?.primary&&card.physiology.primary!=="moderate_lt1"))return slot;
 const modelId=targetModel[source.sport as Sport];
 const model=WORKOUT_V2_MODELS.find(m=>m.id===modelId);
 const main=model?.params.mainSec;
 if(model?.mode!=="steady"||!main||!model.params.warmupSec||!model.params.cooldownSec)return slot;
 const overhead=model.params.warmupSec.default+model.params.cooldownSec.default;
 const maxDelta=Math.min(30,Math.floor(original*0.35));
 for(let min=original-maxDelta;min<=original+maxDelta;min++){
  if(min===original||min<=0)continue;
  const seconds=min*60-overhead;
  if(seconds>=main.min&&seconds<=main.max&&(seconds-main.min)%main.step===0)
   options.push({minutes:min,modelId});
 }
 return slot;
}
function allocate(slots:Slot[]):Map<number,State>{
 let dp=new Map<number,State>([[0,{cost:0,edits:0,chosen:[]}]]);
 for(const slot of slots){
  const next=new Map<number,State>();
  for(const [sum,state] of dp)for(const choice of slot.options){
   const total=sum+choice.minutes;
   const cost=state.cost+Math.abs(choice.minutes-slot.original);
   const edits=state.edits+(choice.modelId?1:0);
   const prev=next.get(total);
   if(!prev||cost<prev.cost||(cost===prev.cost&&edits<prev.edits))
    next.set(total,{cost,edits,chosen:[...state.chosen,choice]});
  }
  dp=next;
 }
 return dp;
}
export interface D115Change{
 day:string;sport:string;originalV1Id:string;fromMin:number;toMin:number;
 modelId:string;structuredSteps:number;
}
export interface D115Report{
 profile:D12Profile;week:3;status:"candidate_native_rechecked"|"blocked"|"no_change_needed";
 reasons:string[];changes:D115Change[];enduranceMinutesBefore:number|null;
 enduranceMinutesAfter:number|null;ratioAfter:D110Decision["percentageBounds"]|null;
 nativeCriticalBefore:number|null;nativeCriticalAfter:number|null;
 introducedCritical:string[];remainingCritical:string[];
 editedPlan:ParsedPlan|null;
 hasCoachApprovedDose:false;mayPersist:false;mayExport:false;mayPublish:false;
}
export function examineD115V2S3(profile:D12Profile):D115Report{
 const fixed={profile,week:3 as const,hasCoachApprovedDose:false as const,
  mayPersist:false as const,mayExport:false as const,mayPublish:false as const};
 const block=(reasons:string[]):D115Report=>({...fixed,status:"blocked",reasons,
   changes:[],enduranceMinutesBefore:null,enduranceMinutesAfter:null,
   ratioAfter:null,nativeCriticalBefore:null,nativeCriticalAfter:null,
   introducedCritical:[],remainingCritical:[],editedPlan:null});
 const built=projectD12Profile(profile,[],true);
 const original=built.candidatePlan;
 const week=built.weeklyPreview.find(w=>w.week===3);
 if(!original||built.status!=="candidate"||!week)return block(["D115_SOURCE_UNAVAILABLE"]);
 const slots=week.sessions.map(slotDomain);
 const baseline=attachD110SourceBrickProof(week.sessions.map(s=>({
  sport:s.sport,id:s.id,minutes:s.minutes})));
 if(baseline.ok===false)return block(baseline.reasons);
 const beforeRatio=examineD110TimeRatio(baseline.sessions,3);
 const beforeIssues=nativeChecks(original,profile);
 const criticalBefore=beforeIssues.filter(x=>CRITICAL.has(x.severity));
 const unchanged=(status:"no_change_needed"):D115Report=>({...fixed,status,
  reasons:["unchanged_original_native_issues_remain"],
  changes:[],enduranceMinutesBefore:beforeRatio.denominatorSec===null?null:beforeRatio.denominatorSec/60,
  enduranceMinutesAfter:beforeRatio.denominatorSec===null?null:beforeRatio.denominatorSec/60,
  ratioAfter:beforeRatio.percentageBounds,nativeCriticalBefore:criticalBefore.length,
  nativeCriticalAfter:criticalBefore.length,introducedCritical:[],
  remainingCritical:criticalBefore.map(i=>i.code),editedPlan:null});
 if(beforeRatio.status==="fully_accounted_inside_bands")return unchanged("no_change_needed");
 const bikes=slots.filter(s=>s.sport==="bike"),runs=slots.filter(s=>s.sport==="run");
 const totalBefore=[...bikes,...runs].reduce((sum,s)=>sum+s.original,0);
 const a=allocate(bikes),b=allocate(runs);
 let best:{cost:number;edits:number;choices:Choice[]}|null=null;
 for(const [bikeTotal,bs] of a){
  const rs=b.get(totalBefore-bikeTotal);
  if(!rs)continue;
  const pair=[...bikes.map((s,i)=>({...s,choice:bs.chosen[i]})),
              ...runs.map((s,i)=>({...s,choice:rs.chosen[i]}))];
  const test=slots.map(s=>{
   const chosen=pair.find(x=>x===s || (x.day===s.day&&x.sport===s.sport&&x.id===s.id));
   return {sport:s.sport,id:s.id,minutes:chosen?.choice.minutes??s.original};
  });
  const source=attachD110SourceBrickProof(test);
  if(source.ok===false)continue;
  if(examineD110TimeRatio(source.sessions,3).status!=="fully_accounted_inside_bands")continue;
  const cost=bs.cost+rs.cost,edits=bs.edits+rs.edits;
  if(!best||cost<best.cost||(cost===best.cost&&edits<best.edits))
   best={cost,edits,choices:pair.map(x=>x.choice)};
 }
 if(!best)return block(["D115_NO_SAFE_EASY_V2_DURATION_REALLOCATION",
   "key_sessions_and_unverified_V1_intents_untouched"]);
 const chosen=best as {cost:number;edits:number;choices:Choice[]};
 const mapped=[...bikes,...runs].map((s,i)=>({...s,choice:chosen.choices[i]}));
 const changes:D115Change[]=[];
 const draft=structuredClone(original);
 for(const slot of mapped){
  if(!slot.choice.modelId)continue;
  if(slot.key)return block(["D115_KEY_SLOT_EDIT_FORBIDDEN"]);
  const sec=slot.choice.minutes*60;
  const fit=fitWorkoutV2ToDuration(slot.choice.modelId,{...fitInput,maxDurationSec:sec},sec);
  if(fit.ok===false)return block(["D115_FIT_FAILED",...fit.reasons]);
  const preview=previewV2InPlan(fit.candidate,slot.day as DayLower);
  if(preview.ok===false)return block(["D115_BRIDGE_FAILED",...preview.reasons]);
  if(preview.preview.plannedDurationSec!==sec||preview.preview.planSession.catalogId!==null||
     preview.preview.planSession.custom!==true||preview.preview.canAutoInsert!==false)
   return block(["D115_V2_PREVIEW_INVARIANT"]);
  const target=draft.weeks.find(w=>w.weekNumber===3);
  const hits=target?.sessions.filter(s=>!s.isRest&&s.dayName===slot.day&&
    s.sport===slot.sport&&s.catalogId===slot.id&&s.durationMin===slot.original)??[];
  if(!target||hits.length!==1||!slot.id)return block(["D115_STALE_V1_SLOT"]);
  const session=hits[0];
  session.title=preview.preview.planSession.title;
  session.details=preview.preview.planSession.details;
  session.durationMin=slot.choice.minutes;
  session.catalogId=null;session.custom=true;session.isKeySession=false;session.zones=[];
  changes.push({day:slot.day,sport:slot.sport,originalV1Id:slot.id,
    fromMin:slot.original,toMin:slot.choice.minutes,
    modelId:slot.choice.modelId,structuredSteps:preview.preview.exactSteps.length});
 }
 const beforeVolume=original.weeks.flatMap(w=>w.sessions).reduce((n,s)=>n+(s.durationMin??0),0);
 const afterVolume=draft.weeks.flatMap(w=>w.sessions).reduce((n,s)=>n+(s.durationMin??0),0);
 if(changes.length===0||beforeVolume!==afterVolume)return block(["D115_TOTAL_VOLUME_INVARIANT_FAILED"]);
 const afterWeek=draft.weeks.find(w=>w.weekNumber===3);
 if(!afterWeek)return block(["D115_WEEK3_MISSING_AFTER_COPY"]);
 const afterProof=attachD110SourceBrickProof(afterWeek.sessions.filter(s=>!s.isRest)
   .map(s=>({sport:s.sport,id:s.catalogId??null,minutes:s.durationMin??NaN})));
 if(afterProof.ok===false)return block(["D115_BRICK_PROVENANCE_LOST",...afterProof.reasons]);
 const afterRatio=examineD110TimeRatio(afterProof.sessions,3);
 if(afterRatio.status!=="fully_accounted_inside_bands")return block(["D115_RATIO_NOT_REPAIRED"]);
 const afterIssues=nativeChecks(draft,profile);
 const criticalAfter=afterIssues.filter(x=>CRITICAL.has(x.severity));
 const beforeKeys=new Set(criticalBefore.map(i=>[i.code,i.week??"all"].join("|")));
 const introduced=criticalAfter.filter(i=>!beforeKeys.has([i.code,i.week??"all"].join("|")));
 return {...fixed,status:"candidate_native_rechecked",
  reasons:["synthetic_RPE_only","limiter_matching_not_attested","intensity_dose_requires_coach_review",
   ...(criticalAfter.length?["native_critical_issues_remain"]:[])],
  changes,enduranceMinutesBefore:beforeRatio.denominatorSec===null?null:beforeRatio.denominatorSec/60,
  enduranceMinutesAfter:afterRatio.denominatorSec===null?null:afterRatio.denominatorSec/60,
  ratioAfter:afterRatio.percentageBounds,
  nativeCriticalBefore:criticalBefore.length,nativeCriticalAfter:criticalAfter.length,
  introducedCritical:introduced.map(i=>i.code),
  remainingCritical:criticalAfter.map(i=>i.code),
  editedPlan:draft};
}
export function examineD115ThreeProfiles():D115Report[]{
 return D12_PROFILES.map(examineD115V2S3);
}

/** D1.16: make the actual reason for an empty V2 dose domain inspectable.
 * This is a read-only witness; a coach may NOT infer a sports clearance.
 */
export function explainD116S3Domains(){
 return D12_PROFILES.map(profile=>{
  const built=projectD12Profile(profile);
  const week=built.weeklyPreview.find(w=>w.week===3);
  if(built.status!=="candidate"||!week)throw Error("D116_NO_S3_REFERENCE");
  const slots=week.sessions.map(slotDomain);
  return {profile,week:3 as const,slots:slots.map(s=>({
   day:s.day,sport:s.sport,id:s.id,key:s.key,minutes:s.original,
   sourceCategory:WorkoutLibrary.find(c=>c.id===s.id)?.cat??null,
   sourcePhysiologicalIntent:WorkoutLibrary.find(c=>c.id===s.id)?.physiology?.primary??null,
   keyOnRecoveryCard:s.key&&WorkoutLibrary.find(c=>c.id===s.id)?.cat==="D",
   variants:s.options.length-1,
   eligibleForDurationChange:s.options.length>1
  })),mayExport:false as const,sportApproved:false as const};
 });
}
