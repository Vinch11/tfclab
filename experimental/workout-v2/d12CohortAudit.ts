/**
 * D1.2 isolated cohort verification — existing QA preparation and catalogue.
 * This is a feasibility AUDIT, never a 28-day plan. It does not mutate
 * constraints, fixtures, source library, policy or effectiveSessionQuota.
 */
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import { prepareGenerationContracts } from "@/lib/plan/prepareGenerationContracts";
import { catalogueEligibility } from "../../supabase/functions/_shared/sessionCatalogueContract";
import { normalizeRepairSport } from "../../supabase/functions/_shared/repairSportingEquivalence";
import { effectiveSessionQuota } from "../../supabase/functions/_shared/sessionQuotaAccounting";
import type { DaySlot } from "@/engines/plan/weeklySlotLayout";

export const D12_PROFILES = ["aerobic_dominant","glycolytic_dominant","balanced_typical"] as const;
export type D12Profile = typeof D12_PROFILES[number];
const spec=(physiology:D12Profile):PlanningCase=>({
  id:`D1_${physiology}`,objective:"703",level:"trained",
  ambition:"age_group",load:"known_synthetic",physiology, constraints:"unrestricted",
  duration:"native",intermediate:false,
});
type Sport = "swim"|"bike"|"run"|"brick"|"strength";
export interface WeekAudit {
  week:number;phase:string;weekType:string;
  nativeTotalMin:number;nativeTotalMax:number;
  nativeBikeMin:number;effectiveBikeMin:number;nativeBrickMin:number;
  originalPhysicalSlots:number;
  longBikeFloorMin:number|null;
  longBrickFloorMin:number|null;
  independentLongBikeProposed:boolean;
  proposedPhysicalSessions:number;
  nativeTotalPhysicalMismatch:boolean;
  slotSportCount:Record<Sport,number>;
  eligibleSourcesBySport:Record<Sport,number>;
  noEligibleSourceFor:Sport[];
  minCatalogMinutesForOriginalSlots:number|null;
  volumeBudgetMaxMinutes:number|null;
  remainingAfterOriginalMinimumMinutes:number|null;
  verdict:"native_policy_unchanged_not_generated";
}
export interface D12CohortAudit {
  profile:D12Profile; horizon:number; weeks:WeekAudit[];
  originalFixtureUnchanged:true;
  candidate28DaysConstructed:false;
  individualDoseValidated:false;
  clinicalSafetyValidated:false;
  explicitPolicyApprovalRequired:true;
}
/** Uses existing D1 profile inputs. No athlete inference or repaired fixtures. */
export function auditD12Cohort(profile:D12Profile):D12CohortAudit {
  const {prepared}=preparePlanningCaseContext(spec(profile));
  const athlete=prepared.athleteData, config=prepared.planConfig;
  if(config.objective!=="703"||config.ambition!=="age_group"||config.ambitionMeta?.trainingLevel!=="trained") throw new Error("D1_PROFILE_REFERENCE_CHANGED");
  if(config.weeksAvailable!==12)throw new Error("D1_HORIZON_REFERENCE_CHANGED");
  const preparation=prepareGenerationContracts(athlete,{...config,planStartDate:"2026-10-26"},{rotationSeed:0});
  const data:WeekAudit[]=[];
  const sports:Sport[]=["swim","bike","run","brick","strength"];
  for(let w=1;w<=4;w++){
    const entry=preparation.weeklyQuotas[w];
    if(!entry?.layout)throw new Error(`D1_WEEK_${w}_MISSING`);
    const slots=entry.layout.days.flatMap(d=>d.slots);
    const brick=slots.some(s=>s.sport==="brick"&&s.isLongSession);
    const effective=effectiveSessionQuota(entry.quota,slots.filter(s=>s.sport==="brick").length);
    const original=slots.length;
    const distinct=[...new Map([...Object.values(preparation.phaseRepairCatalogs).flat(),
      ...preparation.chunkRepairCatalogs.flat(),...preparation.chunkRegenRepairCatalogs.flat()]
      .map(m=>[m.id,m])).values()];
    const context={objective:preparation.catalogObjective,phase:entry.phase,weekType:entry.weekType};
    const eligible=distinct.filter(m=>catalogueEligibility(m,context).length===0);
    const sourceFor=(s:Sport, slot:DaySlot)=>
      eligible.filter(m=>normalizeRepairSport(m.sport)===s)
        .filter(m=>m.durationMin[1]>=Math.max(m.durationMin[0],slot.minDurationMin??0))
        .filter(m=>m.durationMin[0]<=(slot.maxDurationMin??Infinity));
    const eligibleSourcesBySport=Object.fromEntries(sports.map(s=>[s,eligible.filter(m=>normalizeRepairSport(m.sport)===s).length])) as Record<Sport,number>;
    const minDurations=slots.map(slot=>Math.min(...sourceFor(slot.sport,slot).map(m=>Math.max(m.durationMin[0],slot.minDurationMin??0))));
    const minCatalogMinutesForOriginalSlots=minDurations.every(Number.isFinite)?minDurations.reduce((a,b)=>a+b,0):null;
    const longBikeFloorMin=entry.floors.longRideWeekly?entry.floors.slLongRideMin??null:null;
    const brickFloor=slots.find(s=>s.sport==="brick"&&s.isLongSession)?.minDurationMin??null;
    const counts=Object.fromEntries(sports.map(s=>[s,slots.filter(t=>t.sport===s).length])) as Record<Sport,number>;
    // Separating long bike means a NEW physical bike slot and not silently
    // counting a short brick as a long ride. Do not silently change totals.
    const proposedPhysicalSessions=original+(brick?1:0);
    data.push({
      week:w,phase:entry.phase??"unknown",weekType:entry.weekType,
      nativeTotalMin:entry.quota.totalSessions.min,nativeTotalMax:entry.quota.totalSessions.max,
      nativeBikeMin:entry.quota.bike.min,effectiveBikeMin:effective.bike.min,
      nativeBrickMin:entry.quota.brick.min,originalPhysicalSlots:original,
      longBikeFloorMin,longBrickFloorMin:brickFloor,
      independentLongBikeProposed:brick,proposedPhysicalSessions,
      nativeTotalPhysicalMismatch:proposedPhysicalSessions>effective.totalSessions.max,
      slotSportCount:counts,eligibleSourcesBySport,
      noEligibleSourceFor:sports.filter(s=>counts[s]>0&&eligibleSourcesBySport[s]===0),
      minCatalogMinutesForOriginalSlots,
      volumeBudgetMaxMinutes:entry.volumeBudget?.maxMinutes??null,
      remainingAfterOriginalMinimumMinutes: minCatalogMinutesForOriginalSlots===null||entry.volumeBudget?.maxMinutes===undefined?null:
        entry.volumeBudget.maxMinutes-minCatalogMinutesForOriginalSlots,
      verdict:"native_policy_unchanged_not_generated",
    });
  }
  return {profile,horizon:config.weeksAvailable, weeks:data,
    originalFixtureUnchanged:true,candidate28DaysConstructed:false,
    individualDoseValidated:false,clinicalSafetyValidated:false,explicitPolicyApprovalRequired:true};
}
