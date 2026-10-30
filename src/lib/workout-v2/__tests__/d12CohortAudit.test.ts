import {describe, expect, it} from "vitest";
import {D12_PROFILES,auditD12Cohort} from "../../../../experimental/workout-v2/d12CohortAudit";

describe("D1.2 unchanged three-profile cohort: native weeks 1–4",()=>{
  it.each(D12_PROFILES)("records exact native weekly quotas and status, without 28-day success (%s)",profile=>{
    const audit=auditD12Cohort(profile);
    expect(audit.horizon).toBe(12);
    expect(audit.weeks).toHaveLength(4);
    expect(audit.weeks.map(w=>w.week)).toEqual([1,2,3,4]);
    expect(audit.candidate28DaysConstructed).toBe(false);
    expect(audit.individualDoseValidated).toBe(false);
    expect(audit.clinicalSafetyValidated).toBe(false);
    expect(audit.explicitPolicyApprovalRequired).toBe(true);
    for(const w of audit.weeks){
      expect(w.verdict).toBe("native_policy_unchanged_not_generated");
      expect(w.originalPhysicalSlots).toBeGreaterThan(0);
      expect(w.proposedPhysicalSessions).toBeGreaterThanOrEqual(w.originalPhysicalSlots);
      expect(w.nativeTotalMax).toBeGreaterThan(0);
      expect(w.slotSportCount.brick).toBeLessThanOrEqual(1);
      expect(w.eligibleSourcesBySport.swim).toBeGreaterThan(0);
      expect(w.eligibleSourcesBySport.bike).toBeGreaterThan(0);
      expect(w.eligibleSourcesBySport.run).toBeGreaterThan(0);
      expect(typeof w.stage1BaseBrickEligible).toBe("boolean");
      expect(typeof w.extraIndependentLongBikeEligible).toBe("boolean");
      expect(w.separatedMinCatalogMinutes===null || w.separatedMinCatalogMinutes>=0).toBe(true);
    }
    console.log("D12_COHORT_DIAGNOSTIC="+JSON.stringify({
      profile: audit.profile,
      weeks:audit.weeks.map(w=>({
        week:w.week,type:w.weekType,phase:w.phase,
        nativeTotal:[w.nativeTotalMin,w.nativeTotalMax],
        oldSlots:w.originalPhysicalSlots,splitSlots:w.proposedPhysicalSessions,
        mismatch:w.nativeTotalPhysicalMismatch,brickFloor:w.longBrickFloorMin,
        longBikeFloor:w.longBikeFloorMin,minDose:w.minCatalogMinutesForOriginalSlots,
        maxBudget:w.volumeBudgetMaxMinutes,
        stage1Source:w.stage1BaseBrickEligible,
        independentBikeSource:w.extraIndependentLongBikeEligible,
        splitMinimum:w.separatedMinCatalogMinutes,
        splitMinimumOverBudget:w.separatedMinimumOverBudget,
        remaining:w.remainingAfterOriginalMinimumMinutes,
        sourceCounts:w.eligibleSourcesBySport,
        noSource:w.noEligibleSourceFor,
      })),
    }));
  });
});
