/** D1.14: bounded multi-session duration feasibility, not a training prescription. */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {D12_PROFILES,projectD12Profile} from "./d12Projection";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
import {examineD110TimeRatio} from "./d110TimeRatioFeasibility";
type S={day:string;sport:string;id:string|null;before:number;after:number;min:number;max:number};
export interface D114Result {
 profile:string; week:3;status:"source_bounded_candidate_unvalidated"|"blocked";
 reasons:string[]; changes:Array<{day:string;id:string|null;sport:string;before:number;after:number}>;
 transfersMin:number|null; mayPersist:false;mayExport:false;sportApproved:false;
}
type State={cost:number;values:number[]};
function allocations(entries:S[]):Map<number,State>{
 let states=new Map<number,State>([[0,{cost:0,values:[]}]]);
 for(const s of entries){
  const next=new Map<number,State>();
  for(const [sum,prev] of states){
   for(let value=s.min;value<=s.max;value++){
    const total=sum+value,cost=prev.cost+Math.abs(s.before-value);
    const existing=next.get(total);
    if(!existing||cost<existing.cost)
     next.set(total,{cost,values:[...prev.values,value]});
   }
  }
  states=next;
 }
 return states;
}
export function examineD114MultiSession():D114Result[]{
 return D12_PROFILES.map(profile=>{
  const common={profile,week:3 as const,mayPersist:false as const,
    mayExport:false as const,sportApproved:false as const};
  const blocked=(reasons:string[]):D114Result=>({...common,status:"blocked",reasons,changes:[],transfersMin:null});
  const plan=projectD12Profile(profile);
  const week=plan.weeklyPreview.find(w=>w.week===3);
  if(plan.status!=="candidate"||!week)return blocked(["missing_week3"]);
  const entries:S[]=week.sessions.map(s=>{
   const card=WorkoutLibrary.find(c=>c.id===s.id);
   return {day:s.day,sport:s.sport,id:s.id,before:s.minutes,after:s.minutes,
     min:card?.durationMin[0]??NaN,max:card?.durationMin[1]??NaN};
  });
  const mod=entries.filter(s=>s.sport==="bike"||s.sport==="run");
  if(mod.some(s=>!Number.isSafeInteger(s.before)||!Number.isSafeInteger(s.min)||
    !Number.isSafeInteger(s.max)||s.min>s.max||s.before<s.min||s.before>s.max))
   return blocked(["source_duration_unknown_or_original_outside_range"]);
  const proof0=attachD110SourceBrickProof(entries.map(s=>({sport:s.sport,id:s.id,minutes:s.before})));
  if(proof0.ok===false)return blocked(proof0.reasons);
  const original=examineD110TimeRatio(proof0.sessions,3);
  if(original.denominatorSec===null)return blocked(["incomplete_original_endurance"]);
  if(original.status==="fully_accounted_inside_bands")
   return {...common,status:"source_bounded_candidate_unvalidated",reasons:["no_change_required"],
     changes:[],transfersMin:0};
  const bikes=mod.filter(s=>s.sport==="bike"),runs=mod.filter(s=>s.sport==="run");
  const bikeAlloc=allocations(bikes),runAlloc=allocations(runs);
  const originalModTotal=mod.reduce((n,s)=>n+s.before,0);
  let best:{cost:number;entries:S[]}|null=null;
  for(const [bikeTotal,b] of bikeAlloc){
   const r=runAlloc.get(originalModTotal-bikeTotal);
   if(!r)continue;
   const draft=entries.map(s=>({...s}));
   bikes.forEach((s,i)=>{const target=draft.find(x=>x===s);void target;
     const index=entries.indexOf(s);draft[index].after=b.values[i];});
   runs.forEach((s,i)=>{const index=entries.indexOf(s);draft[index].after=r.values[i];});
   const evidence=attachD110SourceBrickProof(draft.map(s=>({sport:s.sport,id:s.id,minutes:s.after})));
   if(evidence.ok===false)continue;
   const ratios=examineD110TimeRatio(evidence.sessions,3);
   if(ratios.status!=="fully_accounted_inside_bands")continue;
   const cost=b.cost+r.cost;
   if(!best||cost<best.cost)best={cost,entries:draft};
  }
  if(!best)return blocked(["no_multi_session_catalogue_duration_allocation_not_global_impossibility"]);
  const choice=best as {cost:number;entries:S[]};
  return {...common,status:"source_bounded_candidate_unvalidated",
   reasons:["duration_range_only","workout_structure_unverified","native_validation_missing"],
   changes:choice.entries.filter(s=>s.before!==s.after).map(s=>({
    day:s.day,id:s.id,sport:s.sport,before:s.before,after:s.after})),
   transfersMin:choice.cost/2};
 });
}
