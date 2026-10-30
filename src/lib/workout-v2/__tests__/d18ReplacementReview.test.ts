import { describe, expect, it } from "vitest";
import { D12_PROFILES } from "../../../../experimental/workout-v2/d12CohortAudit";
import type { D12Profile } from "../../../../experimental/workout-v2/d12CohortAudit";
import { composeD17Block, type D17Target } from "../../../../experimental/workout-v2/d17BlockComposition";
import { experimentD18Replacement } from "../../../../experimental/workout-v2/d18ReplacementReview";
import { projectD12Profile } from "../../../../experimental/workout-v2/d12Projection";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";

function target(profile:D12Profile,withVerifiedSyntheticAnchor=false):D17Target {
  const preview=composeD17Block(profile);
  if(preview.status!=="experimental_28_day_preview")throw Error("D18_D1_SOURCE_NOT_BUILT");
  const bike=preview.calendar.flatMap(day=>day.sessions
    .filter(s=>day.week<=3&&s.sport==="bike"&&s.key&&s.id&&s.minutes>=50)
    .map(session=>({day,session})))
    .sort((a,b)=>b.session.minutes-a.session.minutes)[0];
  if(!bike)throw Error("D18_KEY_BIKE_SLOT_UNAVAILABLE");
  const {prepared}=preparePlanningCaseContext({
    id:"D1_"+profile,objective:"703",level:"trained",ambition:"age_group",
    load:"known_synthetic",physiology:profile,constraints:"unrestricted",
    duration:"native",intermediate:false,
  } satisfies PlanningCase);
  const limiter=prepared.planConfig.identifiedLimitersRaw?.[0]??"NO_LIMITER";
  return {
    week:bike.day.week,day:bike.day.day,sport:"bike",
    expectedV1Id:bike.session.id!,expectedDurationMin:bike.session.minutes,
    coachRequest:{limiter,focus:"threshold",coachFocusReviewed:true,
      justification:"Experimental QA-only coach hypothesis; does not approve individual dose."},
    anchors:{ftpW:{value:280,verified:withVerifiedSyntheticAnchor,sport:"bike"}},
    provenance:withVerifiedSyntheticAnchor
      ? {anchorEvidenceId:"QA_CONTROLLED_SYNTHETIC_ONLY",verifiedForProvisionalTarget:true}
      : {anchorEvidenceId:null,verifiedForProvisionalTarget:false},
    readiness:"ready",pain:false,recoveryConcern:false,
  };
}

describe("D1.8: V2 replacement ONLY on an offline clone of real D1 candidate",()=>{
  it.each(D12_PROFILES)("refuses clinical approval when the synthetic anchor is unverified: %s",profile=>{
    const before=projectD12Profile(profile);
    const output=experimentD18Replacement(profile,target(profile),"V2_BIKE_02");
    expect(output.status).toBe("refused");
    expect(output.editedPlan).toBeNull();
    expect(output.canPublish).toBe(false);
    expect(before.weeklyPreview).toEqual(projectD12Profile(profile).weeklyPreview);
  });

  it("replays unchanged native validators on a cloned 28-day plan with exactly one V2 alternative",()=>{
    const profile="balanced_typical" as const;
    const req=target(profile,true);
    const baseline=projectD12Profile(profile,[],true);
    const beforePlan=structuredClone(baseline.candidatePlan);
    expect(beforePlan).toBeDefined();
    const result=experimentD18Replacement(profile,req,"V2_BIKE_02");
    expect(result.status).toBe("experiment_revalidated_coach_review");
    if(result.status!=="experiment_revalidated_coach_review")return;
    expect(result.originalCritical).toBe(4);
    expect(result.editedPlan.weeks).toHaveLength(4);
    expect(result.editedPlan.totalWeeks).toBe(12);
    expect(result.raceWeek).toBe(12);
    expect(result.referenceRatioPolicyUnchanged).toBe(true);
    expect(result.canPublish).toBe(false);
    expect(result.canPersist).toBe(false);
    expect(result.canExportNolio).toBe(false);
    expect(result.sportsApproved).toBe(false);
    expect(result.coachReviewRequired).toBe(true);
    expect(result.remainingCritical).toBeGreaterThan(0);
    expect(result.nativeAfter.some(i=>i.code==="sport_ratio"&&i.severity==="error")).toBe(true);
    expect(result.nativeAfter.some(i=>i.code==="race_day"&&i.severity==="error"&&i.week===4)).toBe(false);
    const before=beforePlan!.weeks.flatMap(w=>w.sessions);
    const after=result.editedPlan.weeks.flatMap(w=>w.sessions);
    expect(after).toHaveLength(before.length);
    const changed=after.filter((s,i)=>JSON.stringify(s)!==JSON.stringify(before[i]));
    expect(changed).toHaveLength(1);
    expect(changed[0].catalogId).toBeNull();
    expect(changed[0].custom).toBe(true);
    expect(changed[0].isKeySession).toBe(false);
    expect(changed[0].zones).toEqual([]);
    expect(changed[0].durationMin).toBe(req.expectedDurationMin);
    expect(changed[0].details).toContain("RÉVISION COACH OBLIGATOIRE");
    expect(changed[0].details).toContain("TOTAL EXACT");
    const volume=(sessions:typeof before)=>sessions.reduce((n,s)=>n+(s.durationMin??0),0);
    expect(volume(after)).toBe(volume(before));
    expect(baseline.candidatePlan).toEqual(beforePlan);
    const second=experimentD18Replacement(profile,req,"V2_BIKE_02");
    expect(second.status).toBe(result.status);
    if(second.status==="experiment_revalidated_coach_review"){
      expect(second.nativeAfter).toEqual(result.nativeAfter);
      expect(second.editedPlan).toEqual(result.editedPlan);
    }
  });

  it("refuses stale V1 source and an unrequested model, without mutating D1",()=>{
    const req=target("aerobic_dominant",true);
    expect(experimentD18Replacement("aerobic_dominant",{...req,expectedV1Id:"STALE_ID"},"V2_BIKE_02").status).toBe("refused");
    expect(experimentD18Replacement("aerobic_dominant",req,"V2_RUN_05").status).toBe("refused");
    const baseline=projectD12Profile("aerobic_dominant");
    expect(baseline.countCritical).toBe(3);
    expect(baseline.realPlanValidated).toBe(false);
  });
});
