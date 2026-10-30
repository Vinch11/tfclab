import { describe, expect, it } from "vitest";
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { effectiveSessionQuota } from "../../../../supabase/functions/_shared/sessionQuotaAccounting";
import { compareSeparatedBrickPolicyD1 } from "../../../../experimental/workout-v2/separatedBrickProof";
import { D1_BASE_SLOT_CONTRACTS } from "../../../../experimental/workout-v2/d1Compatibility";

describe("D1 alternative: independent long ride + short Stage1 brick — slot feasibility only",()=>{
  it("uses native 703 age_group 10h load quota without changing any production values",()=>{
    const original=computeWeeklySessionQuota("703","age_group",10,"load");
    expect(original).not.toBeNull();
    expect(original!.downgraded).toBe(false);
    expect(original!.quota).toMatchObject({
      swim:{min:3,max:3},bike:{min:3,max:3},run:{min:3,max:3},
      brick:{min:1,max:1},strength:{min:1,max:1},
      totalSessions:{min:11,max:11},maxSessionsPerDay:2,minFullRestDays:1,
    });
    const effective=effectiveSessionQuota(original!.quota,1);
    expect(effective.bike.min).toBe(2);
    expect(effective.totalSessions.min).toBe(10);
    expect(effective.totalSessions.max).toBe(10);
  });
  it("demonstrates slots can fit in six days if, and ONLY if, physical session accounting is changed",()=>{
    const out=compareSeparatedBrickPolicyD1();
    expect(out.status).toBe("candidate_for_coach_arbitration");
    expect(out.counts).toEqual({swim:3,bike:3,run:3,strength:1,brick:1});
    expect(out.separatePhysicalSlots).toBe(11);
    expect(out.oldConventionSlots).toBe(10);
    expect(out.originalWeeklyMax).toBe(11);
    expect(out.reasons).toEqual([]);
    expect(out.calendar).toHaveLength(7);
    expect(out.calendar.find(d=>d.day==="lundi")?.sessions).toEqual([]);
    expect(out.calendar.find(d=>d.day==="samedi")?.sessions).toContainEqual({sport:"bike",long:true});
    expect(out.calendar.find(d=>d.day==="dimanche")?.sessions).toContainEqual({sport:"brick"});
    expect(out.calendar.some(d=>d.sessions.some(s=>s.sport==="run"&&s.long))).toBe(true);
    expect(out.calendar.every(d=>d.sessions.length<=2)).toBe(true);
  });
  it("never misreports feasibility as 28-day generation, load or recovery validation",()=>{
    const out=compareSeparatedBrickPolicyD1();
    expect(out.individualPrescriptionApproved).toBe(false);
    expect(out.validTrainingDoseProven).toBe(false);
    expect(out.canModifyProductionPolicy).toBe(false);
    expect(out.warnings.join(" ")).toContain("10h availability");
    expect(out.warnings.join(" ")).toContain("Adjacent running-exposure");
    expect(out.warnings.join(" ")).toContain("SPORTING POLICY");
    expect(D1_BASE_SLOT_CONTRACTS[1].minBikeExerciseSec).toBe(4800);
    // No Stage1 long-brick workaround or unauthorized alteration of D1 floors.
  });
});
