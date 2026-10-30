/** D1.13 proof-constrained S3 duration edits — no V1 catalogue mutation. */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {D12_PROFILES,projectD12Profile} from "./d12Projection";
import {examineD110TimeRatio} from "./d110TimeRatioFeasibility";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
type Entry={day:string;sport:string;id:string|null;before:number;after:number;sourceMin:number|null;sourceMax:number|null};
export interface D113Result {profile:string;week:3;status:"candidate_unvalidated"|"blocked";
 reasons:string[];sessions:Entry[];changed:Entry[];
 ratios:ReturnType<typeof examineD110TimeRatio>["percentageBounds"]|null;
 nativeRevalidationRequired:true;sportApproved:false;mayPersist:false;}
/** Explicitly enumerates whole-minute changes only for V1 cards whose source
 * duration range is known. Unknown source or ambiguous brick = fail closed.
 * All untouched sessions retain their original identifier and day.
 */
export function examineD113SourceDurationRepairs():D113Result[]{
 return D12_PROFILES.map(profile=>{
  const plan=projectD12Profile(profile);
  const week=plan.weeklyPreview.find(w=>w.week===3);
  const common={profile,week:3 as const,nativeRevalidationRequired:true as const,
   sportApproved:false as const,mayPersist:false as const};
  const blocked=(reasons:string[],sessions:Entry[]=[]):D113Result=>({...common,status:"blocked",
   reasons,sessions,changed:[],ratios:null});
  if(plan.status!=="candidate"||!week)return blocked(["missing_candidate"]);
  const sessions:Entry[]=week.sessions.map(s=>{
    const card=WorkoutLibrary.find(x=>x.id===s.id);
    return {day:s.day,sport:s.sport,id:s.id,before:s.minutes,after:s.minutes,
      sourceMin:card?.durationMin[0]??null,sourceMax:card?.durationMin[1]??null};
  });
  const originalProof=attachD110SourceBrickProof(sessions.map(s=>({
   sport:s.sport,id:s.id,minutes:s.before})));
  if(originalProof.ok===false)return blocked(originalProof.reasons,sessions);
  const current=examineD110TimeRatio(originalProof.sessions,3);
  if(current.status==="fully_accounted_inside_bands")
   return {...common,status:"candidate_unvalidated",reasons:["no_duration_change_required"],
    sessions,changed:[],ratios:current.percentageBounds};
  const adjustable=sessions.map((s,i)=>({...s,i})).filter(s=>s.sport==="bike"||s.sport==="run");
  if(adjustable.some(s=>s.sourceMin===null||s.sourceMax===null))
   return blocked(["missing_catalogue_source_for_admissible_edit"],sessions);
  const bike=adjustable.filter(s=>s.sport==="bike");
  const run=adjustable.filter(s=>s.sport==="run");
  // Enumerate all single source-verified donor/recipient edits, with minimal
  // transfer first. A failure is NOT proof of global infeasibility.
  for(let delta=1;delta<=60;delta++){
   for(const donor of bike)for(const receiver of run){
    if(donor.before-delta<(donor.sourceMin??Infinity)||
       receiver.before+delta>(receiver.sourceMax??-Infinity))continue;
    const trial=sessions.map(x=>({...x}));
    trial[donor.i].after-=delta;trial[receiver.i].after+=delta;
    const proof=attachD110SourceBrickProof(trial.map(s=>({
      sport:s.sport,id:s.id,minutes:s.after})));
    if(proof.ok===false)continue;
    const check=examineD110TimeRatio(proof.sessions,3);
    if(check.status!=="fully_accounted_inside_bands")continue;
    return {...common,status:"candidate_unvalidated",reasons:[
       "single_pair_source_duration_ranges_only",
       "structure_at_new_duration_not_validated",
       "native_plan_revalidation_required"],sessions:trial,
      changed:trial.filter(s=>s.after!==s.before),ratios:check.percentageBounds};
   }
  }
  return blocked(["no_single_pair_source_admissible_edit_found_not_global_infeasibility"],sessions);
 });
}
