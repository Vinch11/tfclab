/**
 * D1.2 isolated COUNTERFACTUAL projection (no production policy mutation).
 * Reuses existing D1 engine and real candidate catalogue, changing only a
 * copy of first four weekly layouts/quotas under an explicit experiment flag.
 * Does not authorize the proposed policy, individual dose, or Nolio export.
 */
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import type { WeeklySlotLayout, DaySlot, DayName, LayoutSport } from "@/engines/plan/weeklySlotLayout";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { constructDeterministicPlan, type ExperimentalAssemblyContract } from "./d1EngineReference";
import { D12_PROFILES, type D12Profile } from "./d12CohortAudit";
export {D12_PROFILES};
const DAYS:DayName[]=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
const ORDERS: Record<LayoutSport,DayName[]> = {
 run:["mardi","vendredi","jeudi","mercredi","samedi"],
 bike:["mardi","jeudi","mercredi","vendredi","samedi"],
 swim:["jeudi","vendredi","samedi","mardi","mercredi"],
 strength:["mercredi","mardi","jeudi","samedi"],
 brick:["dimanche"],
};
type Tagged={slot:DaySlot;id:number};
export function proposeSeparateLayout(entry:WeekQuotaEntry):WeeklySlotLayout {
  if(!entry.layout || entry.phase!=="base") throw new Error("D12_BASE_LAYOUT_REQUIRED");
  const original=entry.layout.days.flatMap(d=>d.slots.map(slot=>({...slot})));
  const longBrick=original.find(s=>s.sport==="brick"&&s.isLongSession);
  if(!longBrick || !entry.floors.longRideWeekly||!entry.floors.slLongRideMin)throw new Error("D12_BRICK_LONG_CONTRACT_MISSING");
  const longRun=original.find(s=>s.sport==="run"&&s.isLongSession);
  const transformed=original.map(slot=>slot===longBrick
    ? {...slot,isLongSession:false,minDurationMin:60,maxDurationMin:90}
    : slot);
  transformed.push({sport:"bike",isLongSession:true,isKeySession:true,minDurationMin:entry.floors.slLongRideMin});
  const target=Object.fromEntries((["swim","bike","run","brick","strength"] as LayoutSport[])
    .map(s=>[s,transformed.filter(x=>x.sport===s).length])) as Record<LayoutSport,number>;
  const output:WeeklySlotLayout={
    weekType:entry.weekType,
    days:DAYS.map(dayName=>({dayName,isRest:dayName==="lundi",slots:[]})),
    targetsBySport:target,
    ...(entry.layout.requiredEvents?.length?{requiredEvents:entry.layout.requiredEvents}:{}),
  };
  const place=(day:DayName,slot:DaySlot)=>{
    const d=output.days.find(x=>x.dayName===day)!;
    if(d.isRest || d.slots.length>=entry.quota.maxSessionsPerDay ||
       d.slots.some(x=>x.sport===slot.sport)||day==="lundi")return false;
    if(day==="dimanche"&&slot.sport!=="brick")return false;
    if(slot.sport==="brick" && d.slots.length)return false;
    if(d.slots.some(x=>x.sport==="brick"))return false;
    if(slot.sport==="strength"&&day==="vendredi")return false;
    if(slot.sport==="run"&&day==="samedi")return false; // keep long bike day without run
    return true;
  };
  const anchor=(sport:LayoutSport,day:DayName,predicate:(s:DaySlot)=>boolean)=>{
    const index=transformed.findIndex(s=>s.sport===sport&&predicate(s));
    if(index<0)throw new Error(`D12_ANCHOR_${sport}_NOT_FOUND`);
    const [slot]=transformed.splice(index,1);
    if(!place(day,slot))throw new Error(`D12_ANCHOR_${day}_INFEASIBLE`);
    output.days.find(x=>x.dayName===day)!.slots.push(slot);
  };
  anchor("brick","dimanche",()=>true);
  anchor("bike","samedi",s=>!!s.isLongSession);
  if(longRun)anchor("run","mercredi",s=>!!s.isLongSession);
  const tasks:Tagged[]=transformed
    .sort((a,b)=>({run:0,bike:1,swim:2,strength:3,brick:4}[a.sport]-
                    {run:0,bike:1,swim:2,strength:3,brick:4}[b.sport]))
    .map((slot,id)=>({slot,id}));
  let nodes=0;
  const search=(index:number):boolean=>{
    if(++nodes>50000)return false;
    if(index===tasks.length)return true;
    const slot=tasks[index].slot;
    for(const day of ORDERS[slot.sport]){
      if(!place(day,slot))continue;
      const d=output.days.find(x=>x.dayName===day)!;
      d.slots.push(slot);
      if(search(index+1))return true;
      d.slots.pop();
    }
    return false;
  };
  if(!search(0))throw new Error("D12_SPLIT_LAYOUT_UNPLACEABLE");
  const count=output.days.reduce((n,d)=>n+d.slots.length,0);
  if(count!==original.length+1)throw new Error("D12_SESSION_LOSS");
  return output;
}
export interface D12ProjectionResult {
  profile:D12Profile;
  status:"candidate"|"refused"|"experimental_exception";
  reason:string|null;
  weeksConstructed:number;
  slotsByWeek:number[];
  issues: {code:string;week?:number;severity:string}[];
  countCritical:number;
  criticalDetails:Array<{code:string;week?:number;severity:string;message?:string}>;
  weeklyPreview:Array<{week:number;volumeMin:number;bySport:Record<string,number>;sessions:Array<{day:string;sport:string;id:string|null;minutes:number;key:boolean}>}>;
  noLLM:true; canExport:false; canPersist:false;
  realPlanValidated:false; individualPrescriptionApproved:false;
}
/** Re-run once for each unchanged D1 archetype, original 12-week context.
 * Intentional test-only stop after week 4; future event remains in context.
 * A candidate is never a deployable 4-week plan.
 */
export function projectD12Profile(profile:D12Profile):D12ProjectionResult {
  const spec:PlanningCase={id:`D1_${profile}`,objective:"703",level:"trained",ambition:"age_group",
    load:"known_synthetic",physiology:profile,constraints:"unrestricted",duration:"native",intermediate:false};
  const {prepared}=preparePlanningCaseContext(spec);
  const config={...prepared.planConfig,planStartDate:"2026-10-26"};
  const transformedWeeks: number[]=[];
  const contract:ExperimentalAssemblyContract={
    id:"EXPERIMENTAL_D12_SEPARATE_BRICK_NOT_APPROVED",
    adapt(preparation){
      for(let week=1;week<=4;week++){
        const original=preparation.weeklyQuotas[week];
        if(!original?.layout)throw new Error("D12_WEEK_UNAVAILABLE");
        const adjusted=proposeSeparateLayout(original);
        // Explicit test-only accounting hypothesis. The existing source
        // quota and production effectiveSessionQuota are NOT mutated.
        original.layout=adjusted;
        original.quota={
          ...original.quota,
          bike:{...original.quota.bike,max:original.quota.bike.max+1},
          totalSessions:{...original.quota.totalSessions,max:original.quota.totalSessions.max+1},
        };
        transformedWeeks.push(adjusted.days.reduce((n,d)=>n+d.slots.length,0));
      }
    },
    filterCandidate(card,{slot}){
      return slot.sport!=="brick"||card.id==="BRICK_STAGE1_INTRO";
    },
    doseRange(card,{slot}){
      if(slot.sport!=="brick")return undefined as unknown as [number,number];
      return card.id==="BRICK_STAGE1_INTRO"?[60,90]:null;
    },
  };
  try{
    const result=constructDeterministicPlan(structuredClone(prepared.athleteData),structuredClone(config),
      {maxNodes:20000,maxMilliseconds:Number.MAX_VALUE,experimentalFirstWeeks:4},contract);
    const issues=result.issues.map(x=>({code:x.code,week:x.week,severity:x.severity}));
    const criticalDetails=result.issues.filter(x=>["error","critical","blocking"].includes(x.severity))
      .map(x=>({code:x.code,week:x.week,severity:x.severity,message:x.message?.slice(0,320)}));
    const weeklyPreview=(result.candidate?.weeks??[]).map(w=>{
      const sessions=w.sessions.filter(s=>!s.isRest);
      return {
        week:w.weekNumber,volumeMin:sessions.reduce((n,s)=>n+(s.durationMin??0),0),
        bySport:Object.fromEntries([...new Set(sessions.map(s=>s.sport))].map(s=>[s,sessions.filter(x=>x.sport===s).length])),
        sessions:sessions.map(s=>({day:s.dayName,sport:s.sport,id:s.catalogId??null,minutes:s.durationMin??0,key:!!s.isKeySession})),
      };
    });
    return {profile,status:result.status,reason:result.reason??null,
      weeksConstructed:result.candidate?.weeks.length??0,
      slotsByWeek:transformedWeeks,issues,countCritical:criticalDetails.length,criticalDetails,weeklyPreview,
      noLLM:true,canExport:false,canPersist:false,
      realPlanValidated:false,individualPrescriptionApproved:false};
  }catch(e){
    return {profile,status:"experimental_exception",reason:e instanceof Error?e.message:String(e),
      weeksConstructed:0,slotsByWeek:transformedWeeks,issues:[],countCritical:0,criticalDetails:[],weeklyPreview:[],
      noLLM:true,canExport:false,canPersist:false,
      realPlanValidated:false,individualPrescriptionApproved:false};
  }
}
