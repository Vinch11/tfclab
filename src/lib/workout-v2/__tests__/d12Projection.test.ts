import {describe,expect,it} from "vitest";
import { D12_PROFILES, projectD12Profile } from "../../../../experimental/workout-v2/d12Projection";
import { compareSeparatedBrickPolicyD1 } from "../../../../experimental/workout-v2/separatedBrickProof";
describe("D1.2 experimental 28-day projection attempt (never approved)",()=>{
  it.each(D12_PROFILES)("attempts native 4-week block without model calls: %s",profile=>{
    const before=compareSeparatedBrickPolicyD1();
    const r=projectD12Profile(profile);
    expect(r.profile).toBe(profile);
    expect(r.noLLM).toBe(true);
    expect(r.canExport).toBe(false);
    expect(r.canPersist).toBe(false);
    expect(r.realPlanValidated).toBe(false);
    expect(r.individualPrescriptionApproved).toBe(false);
    expect(r.weeksConstructed).toBeLessThanOrEqual(4);
    expect(before.status).toBe("candidate_for_coach_arbitration");
    // The test intentionally does NOT assert a success; full plan acceptance
    // requires unchanged sporting validation and an authorized policy.
    console.log("D12_PROJECTION_ATTEMPT="+JSON.stringify({
      profile:r.profile,status:r.status,reason:r.reason,weeksConstructed:r.weeksConstructed,
      slotsByWeek:r.slotsByWeek,critical:r.countCritical,
      issueCodes:r.issues.slice(0,30),
    }));
  });
});
