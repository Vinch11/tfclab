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
    // Frozen counterfactual benchmark: three technically assembled candidates
    // but NOT a sports GO. No relaxation of critical checks is permitted.
    expect(r.status).toBe("candidate");
    expect(r.weeksConstructed).toBe(4);
    expect(r.countCritical).toBeGreaterThan(0);
    expect(r.weeklyPreview).toHaveLength(4);
    expect(r.weeklyPreview.every(w=>w.sessions.length>0)).toBe(true);
    expect(r.weeklyPreview.map(w=>w.volumeMin)).toEqual([360,395,430,300]);
    expect(r.criticalDetails.some(x=>x.code==="load_pattern")).toBe(false);
    // This is the FIRST FOUR weeks of a 12-week preparation, not race week 4.
    // The actual declared competition is in week 12, so the original
    // validator must report the absent future week as a WARNING, never
    // invent a race-day ERROR in S4.
    expect(r.criticalDetails.some(x=>x.code==="race_day")).toBe(false);
    expect(r.issues.some(x=>x.code==="race_day"&&x.severity==="warning"&&x.week===12)).toBe(true);

    expect(before.status).toBe("candidate_for_coach_arbitration");
    // The test intentionally does NOT assert a success; full plan acceptance
    // requires unchanged sporting validation and an authorized policy.
    // Diagnostic comparison only: same candidate, no dosage mutation.
    // Existing sport-ratio validator counts occurrences; this alternative
    // divides total SWIM minutes by endurance minutes (SWIM+BIKE+RUN+BRICK).
    // Strength is excluded, brick remains in denominator with no invented
    // bike/run split. Time shares are NOT automatically approved targets.
    const loadSessions=r.weeklyPreview.filter(w=>w.week<=3).flatMap(w=>w.sessions)
      .filter(x=>["swim","bike","run","brick"].includes(x.sport));
    const enduranceMinutes=loadSessions.reduce((n,x)=>n+x.minutes,0);
    const swimMinutes=loadSessions.filter(x=>x.sport==="swim").reduce((n,x)=>n+x.minutes,0);
    const durationShare=enduranceMinutes?Math.round(swimMinutes/enduranceMinutes*1000)/10:null;
    expect(enduranceMinutes).toBeGreaterThan(0);
    expect(swimMinutes).toBeGreaterThan(0);
    expect(durationShare).not.toBeNull();
    console.log("D12_DURATION_RATIO_DIAGNOSTIC="+JSON.stringify({
      profile:r.profile,swimMinutes,enduranceMinutes,swimTimePct:durationShare,
      comparisonOnly:true,nativeSessionCountSwimPct:29,
      source:"same experimental four-week candidate S1–S3; strength excluded; brick not redistributed",
    }));
    console.log("D12_PROJECTION_ATTEMPT="+JSON.stringify({
      profile:r.profile,status:r.status,reason:r.reason,weeksConstructed:r.weeksConstructed,
      slotsByWeek:r.slotsByWeek,critical:r.countCritical,
      criticalDetails:r.criticalDetails,
      weekSummaries:r.weeklyPreview.map(w=>({week:w.week,volumeMin:w.volumeMin,bySport:w.bySport})),
      // Full schedules are preserved in the returned candidate, not reported
      // as Nolio-ready or approved athlete prescriptions.
      sessionSamples:r.weeklyPreview.flatMap(w=>w.sessions).slice(0,14),
    }));
  });
});
