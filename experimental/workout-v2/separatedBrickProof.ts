/**
 * D1.2 — OFFLINE policy comparison, NOT a new schedule generator.
 *
 * It demonstrates only that 70.3 age_group *slot counts* may fit the declared
 * 6 training days / <=2 sessions-day when a short brick no longer replaces the
 * standalone long ride. It neither overrides weeklySlotLayout nor prescribes.
 * Duration budget, response to training and individual recovery are UNKNOWN.
 */
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { effectiveSessionQuota } from "../../supabase/functions/_shared/sessionQuotaAccounting";

export type D12Sport = "swim"|"bike"|"run"|"strength"|"brick";
export type D12Day = "lundi"|"mardi"|"mercredi"|"jeudi"|"vendredi"|"samedi"|"dimanche";
export interface D12Slot { sport:D12Sport; long?:boolean; }
export interface D12DaySlots { day:D12Day; sessions: readonly D12Slot[]; }
export type D12Result = {
  status:"candidate_for_coach_arbitration"|"refused";
  source:"native-703-age-group-load";
  oldConventionSlots:number;
  separatePhysicalSlots:number;
  originalWeeklyMax:number;
  calendar: readonly D12DaySlots[];
  counts: Record<D12Sport,number>;
  reasons: string[];
  warnings: string[];
  individualPrescriptionApproved:false;
  validTrainingDoseProven:false;
  canModifyProductionPolicy:false;
};
const WEEK: readonly D12DaySlots[] = [
  {day:"lundi",sessions:[]},
  {day:"mardi",sessions:[{sport:"run"},{sport:"bike"}]},
  {day:"mercredi",sessions:[{sport:"run",long:true},{sport:"strength"}]},
  {day:"jeudi",sessions:[{sport:"swim"},{sport:"bike"}]},
  {day:"vendredi",sessions:[{sport:"run"},{sport:"swim"}]},
  {day:"samedi",sessions:[{sport:"bike",long:true},{sport:"swim"}]},
  {day:"dimanche",sessions:[{sport:"brick"}]},
];
const SPORTS: readonly D12Sport[]=["swim","bike","run","strength","brick"];
/**
 * Returns a proposed SLOT ALLOCATION, not certified programming.
 * Full production validation must be reworked on explicit coach authorization.
 */
export function compareSeparatedBrickPolicyD1():D12Result {
  const out=computeWeeklySessionQuota("703","age_group",10,"load");
  if(!out || out.downgraded)return {
    status:"refused",source:"native-703-age-group-load",
    oldConventionSlots:0,separatePhysicalSlots:0,originalWeeklyMax:0,calendar:WEEK,
    counts:{swim:0,bike:0,run:0,strength:0,brick:0},
    reasons:["native_quota_not_available_or_downgraded"],warnings:[],
    individualPrescriptionApproved:false,validTrainingDoseProven:false,
    canModifyProductionPolicy:false,
  };
  const q=out.quota;
  const counts=Object.fromEntries(SPORTS.map(s=>[s,WEEK.reduce((total,d)=>total+d.sessions.filter(x=>x.sport===s).length,0)])) as Record<D12Sport,number>;
  const actual=Object.values(counts).reduce((a,b)=>a+b,0);
  const old=effectiveSessionQuota(q,q.brick.min);
  const oldSlots=q.swim.min+old.bike.min+q.run.min+q.brick.min+q.strength.min;
  const reasons:string[]=[];
  const minMatches=SPORTS.every(s=>counts[s]===q[s].min);
  if(!minMatches)reasons.push("sport_minima_not_preserved");
  if(actual<q.totalSessions.min||actual>q.totalSessions.max)reasons.push("physical_sessions_outside_native_total");
  if(WEEK.filter(d=>d.sessions.length===0).length<q.minFullRestDays)reasons.push("insufficient_rest_days");
  if(WEEK.some(d=>d.sessions.length>q.maxSessionsPerDay))reasons.push("too_many_sessions_per_day");
  if(WEEK.some(d=>new Set(d.sessions.map(s=>s.sport)).size!==d.sessions.length))reasons.push("duplicate_sport_same_day");
  if(WEEK.some(d=>d.sessions.some(s=>s.sport==="brick")&&d.sessions.some(s=>["run","bike","strength"].includes(s.sport))))reasons.push("brick_day_sport_conflict");
  if(!WEEK.some(d=>d.sessions.some(s=>s.sport==="bike"&&s.long)) ||
     !WEEK.some(d=>d.sessions.some(s=>s.sport==="run"&&s.long)))reasons.push("missing_independent_long_sessions");
  if(WEEK.find(d=>d.day==="vendredi")!.sessions.some(s=>s.sport==="strength"))reasons.push("strength_before_saturday_long_bike");
  const runDays=WEEK.map(d=>d.sessions.some(s=>s.sport==="run"||s.sport==="brick"));
  const bikeDays=WEEK.map(d=>d.sessions.some(s=>s.sport==="bike"||s.sport==="brick"));
  const pairs=(days:boolean[])=>days.reduce((n,active,i)=>n+(active && days[(i+1)%7]?1:0),0);
  const warnings=[
    "NOT a 28-day training plan. Durations of other sessions, total volume, exact recovery and training capacities are unknown.",
    "Independent brick consumes one additional physical session compared with current effectiveSessionQuota accounting.",
    "Changing counting of bike, brick and totalSessions is a SPORTING POLICY change; none applied.",
    `Adjacent running-exposure day-pairs (including brick run): ${pairs(runDays)}; recovery and run tolerance need coach review.`,
    `Adjacent cycling-exposure day-pairs (including brick bike): ${pairs(bikeDays)}; load distribution needs coach review.`,
    "Sample weekly slots are not a proof that required intensity, long-run doses, 10h availability, or workout compatibility are satisfiable.",
  ];
  return {status:reasons.length?"refused":"candidate_for_coach_arbitration",
    source:"native-703-age-group-load",oldConventionSlots:oldSlots,
    separatePhysicalSlots:actual,originalWeeklyMax:q.totalSessions.max,
    calendar:WEEK,counts,reasons,warnings,
    individualPrescriptionApproved:false,validTrainingDoseProven:false,canModifyProductionPolicy:false};
}
