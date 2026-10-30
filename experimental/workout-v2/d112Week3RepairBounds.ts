/** D1.12: mathematical duration-transfer lower bounds, NOT a calendar repair. */
import {projectD12Profile,D12_PROFILES} from "./d12Projection";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
import {auditD14DurationRatios} from "./d14RatioEvidence";
import {D110_703_TARGETS,type D110Targets} from "./d110TimeRatioFeasibility";
export interface D112Bound {
 profile:string;week:3;status:"lower_bound_only"|"unverified";
 baseline:{swimMin:number;bikeMin:number;runMin:number}|null;
 proposed:{swimMin:number;bikeMin:number;runMin:number}|null;
 transferMin:number|null; transfers:{from:"bike"|"run"|"swim";to:"bike"|"run"|"swim";minutes:number}[];
 reasons:string[]; calendarFeasible:false;individualDoseApproved:false;
}
/** Find smallest WHOLE-MINUTE transfer, fixed total and exact sourced brick,
 * with no session moved or modified. This is only a lower bound for planning.
 */
export function examineD112Week3Bounds(tolerancePoints=3):D112Bound[]{
 if(!Number.isFinite(tolerancePoints)||tolerancePoints<0||tolerancePoints>20)throw Error("D112_INVALID_TOLERANCE");
 const bands=Object.fromEntries((["swim","bike","run"] as const).map(s=>[s,[
  Math.max(0,D110_703_TARGETS[s][0]-tolerancePoints),
  Math.min(100,D110_703_TARGETS[s][1]+tolerancePoints)
 ]])) as D110Targets;
 return D12_PROFILES.map(profile=>{
  const baseline={profile,week:3 as const,status:"unverified" as const,
   baseline:null,proposed:null,transferMin:null,transfers:[],
   reasons:[] as string[],calendarFeasible:false as const,individualDoseApproved:false as const};
  const plan=projectD12Profile(profile);
  const week=plan.weeklyPreview.find(w=>w.week===3);
  if(plan.status!=="candidate"||!week)return {...baseline,reasons:["missing_week3_candidate"]};
  const proof=attachD110SourceBrickProof(week.sessions.map(s=>({sport:s.sport,id:s.id,minutes:s.minutes})));
  if(proof.ok===false)return {...baseline,reasons:proof.reasons};
  const audit=auditD14DurationRatios(proof.sessions);
  if(audit.enduranceSeconds===null||audit.reasonCodes.length)return {...baseline,reasons:audit.reasonCodes};
  const total=audit.enduranceSeconds/60;
  const original=[audit.countedSeconds.swim/60,audit.countedSeconds.bike/60,audit.countedSeconds.run/60];
  if(!Number.isInteger(total)||!original.every(Number.isInteger)||
     original.reduce((a,b)=>a+b,0)!==total)
   return {...baseline,reasons:["non_integer_or_transition_minutes"]};
  const sports=["swim","bike","run"] as const;
  const inBands=(vals:number[])=>vals.every((v,i)=>{
   const b=bands[sports[i]];return (v/total*100)>=b[0]-1e-9&&(v/total*100)<=b[1]+1e-9;
  });
  let best:number[]|null=null,score=Infinity;
  for(let swim=0;swim<=total;swim++){
   if(swim/total*100<bands.swim[0]-1e-9||swim/total*100>bands.swim[1]+1e-9)continue;
   for(let bike=0;bike<=total-swim;bike++){
    const vals=[swim,bike,total-swim-bike];
    if(!inBands(vals))continue;
    const cost=vals.reduce((acc,v,i)=>acc+Math.abs(v-original[i]),0)/2;
    if(cost<score){best=vals;score=cost;}
   }
  }
  if(!best)return {...baseline,reasons:["no_whole_minute_allocation_in_bands"]};
  const chosen:number[]=best;
  const deficit=chosen.map((v,i)=>Math.max(0,v-original[i]));
  const surplus=chosen.map((v,i)=>Math.max(0,original[i]-v));
  const transfers:D112Bound["transfers"]=[];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
   const minutes=Math.min(surplus[i],deficit[j]);if(minutes>0){
    transfers.push({from:sports[i],to:sports[j],minutes});
    surplus[i]-=minutes;deficit[j]-=minutes;
   }
  }
  const fmt=(v:number[])=>({swimMin:v[0],bikeMin:v[1],runMin:v[2]});
  return {profile,week:3,status:"lower_bound_only" as const,baseline:fmt(original),
   proposed:fmt(chosen),transferMin:score,transfers,
   reasons:["ratio_arithmetic_only","session_bounds_and_recovery_not_checked"],
   calendarFeasible:false as const,individualDoseApproved:false as const};
 });
}
