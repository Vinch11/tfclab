/** D1.11 — weekly diagnosis, NOT a new sport-ratio policy or production validator. */
import {D12_PROFILES,projectD12Profile} from "./d12Projection";
import {examineD110TimeRatio,type D110Decision} from "./d110TimeRatioFeasibility";
import {attachD110SourceBrickProof} from "./d110V1BrickSourceProof";
export interface D111Week {
 profile:string; week:number; volumeMin:number;
 originalCriticalCodes:string[];
 sourceVerified:boolean; reasonCodes:string[];
 nominal:D110Decision|null; plus3:D110Decision|null;
 sportApproved:false; canExport:false;
}
export function examineD111WeeklyProfiles():D111Week[] {
 return D12_PROFILES.flatMap(profile=>{
  const candidate=projectD12Profile(profile);
  if(candidate.status!=="candidate"||candidate.weeksConstructed!==4)
   throw new Error("D111_SOURCE_CANDIDATE_UNAVAILABLE");
  return candidate.weeklyPreview.filter(w=>w.week>=1&&w.week<=3).map(w=>{
   const evidence=attachD110SourceBrickProof(w.sessions.map(s=>({
     sport:s.sport,id:s.id,minutes:s.minutes
   })));
   const common={profile,week:w.week,volumeMin:w.volumeMin,
    originalCriticalCodes:candidate.criticalDetails.filter(i=>i.week===w.week).map(i=>i.code),
    sportApproved:false as const,canExport:false as const};
   if(evidence.ok===false)return {...common,sourceVerified:false,reasonCodes:evidence.reasons,
    nominal:null,plus3:null};
   return {...common,sourceVerified:true,reasonCodes:[],
    nominal:examineD110TimeRatio(evidence.sessions),
    plus3:examineD110TimeRatio(evidence.sessions,3)};
  });
 });
}
