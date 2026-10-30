import {describe,expect,it} from "vitest";
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { SPORT_RATIO_TARGETS } from "@/engines/plan/planValidator";
import { computeD12RatioCertificate } from "../../../../experimental/workout-v2/d12RatioCertificate";
import { experimentalDeclaredRaceWeekNumbers } from "../../../../experimental/workout-v2/d1EngineReference";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";

describe("D1 native policy contradictions and partial-horizon provenance",()=>{
  it("shows age-group native frequencies yield 29% swim, critical above 20+8 while no sessions can alter fixed counts",()=>{
    const proof=computeD12RatioCertificate();
    expect(proof.requiredSessions).toEqual({swim:9,bike:9,run:9,brick:3});
    expect(proof.countedSessions).toEqual({swim:9,bike:11,run:11});
    expect(proof.derivedPct).toEqual({swim:29,bike:35,run:35});
    expect(proof.nativeSwimTarget).toEqual([15,20]);
    expect(proof.violatesCriticalSwimThreshold).toBe(true);
    expect(proof.independentOfWorkoutCatalogue).toBe(true);
    expect(proof.currentPolicyUnchanged).toBe(true);
    expect(SPORT_RATIO_TARGETS["703"].swim).toEqual([15,20]);
    expect(computeWeeklySessionQuota("703","age_group",10,"load")!.quota.swim).toEqual({min:3,max:3});
  });
  it("dates S12 race from original unchanged fixture, not the 4-week extracted end",()=>{
    const spec:PlanningCase={id:"D1_race_context",objective:"703",level:"trained",ambition:"age_group",
      load:"known_synthetic",physiology:"aerobic_dominant",constraints:"unrestricted",duration:"native",intermediate:false};
    const {prepared}=preparePlanningCaseContext(spec);
    expect(prepared.planConfig.weeksAvailable).toBe(12);
    expect(experimentalDeclaredRaceWeekNumbers({...prepared.planConfig,planStartDate:"2026-10-26"})).toEqual([12]);
    expect(experimentalDeclaredRaceWeekNumbers({...prepared.planConfig,planStartDate:"2026-10-26",raceGoals:[]})).toEqual([]);
  });
});
