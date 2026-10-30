import {describe, expect, it} from "vitest";
import {examineD110TimeRatio,examineD110ThreeProfiles} from "../../../../experimental/workout-v2/d110TimeRatioFeasibility";
import {deriveD110PlannedStage1Brick,isD110Stage1SourceUnchanged,attachD110SourceBrickProof}
  from "../../../../experimental/workout-v2/d110V1BrickSourceProof";
import {WorkoutLibrary} from "@/lib/workoutLibrary";

describe("D1.10: joint 70.3 time ratios without invented V1 brick allocation",()=>{
  it("proves incompatibility when bike and run cannot reach even 3-point tolerance",()=>{
    // Controlled numeric example, NOT a claim about an individual's dose.
    const source=[
      {sport:"swim",durationMin:180},{sport:"bike",durationMin:600},
      {sport:"run",durationMin:185},{sport:"brick",durationMin:100},
    ];
    const nominal=examineD110TimeRatio(source);
    expect(nominal.denominatorSec).toBe(1065*60);
    expect(nominal.percentageBounds).toEqual({
      swim:[16.9,16.9],bike:[56.3,65.7],run:[17.4,26.8],
    });
    expect(nominal.provableOutOfBandSports).toEqual(["bike","run"]);
    expect(nominal.jointlyFeasible).toBe(false);
    expect(nominal.status).toBe("incompatible_for_any_brick_allocation");
    const plus3=examineD110TimeRatio(source,3);
    expect(plus3.status).toBe("incompatible_for_any_brick_allocation");
    expect(plus3.provableOutOfBandSports).toEqual(["bike","run"]);
    expect(plus3.targets.bike).toEqual([37,53]);
    expect(plus3.targets.run).toEqual([27,43]);
    const plus8=examineD110TimeRatio(source,8);
    expect(plus8.targets.bike).toEqual([32,58]);
    expect(plus8.targets.run).toEqual([22,48]);
    expect(plus8.policyActivated).toBe(false);
    expect(plus8.canCertifyPlan).toBe(false);
    expect(source[3]).toEqual({sport:"brick",durationMin:100});
  });

  it("does not assume independent marginal feasibility implies joint feasibility",()=>{
    const bands={
      swim:[18,18] as [number,number],
      bike:[50,55] as [number,number],
      run:[40,45] as [number,number],
    };
    const result=examineD110TimeRatio([
      {sport:"swim",durationMin:180},
      {sport:"bike",durationMin:350},
      {sport:"run",durationMin:250},
      {sport:"brick",durationMin:220},
    ],0,bands);
    // Marginal possible: bike 35–57%; run 25–47%; but minimum allocations
    // of 150min + 150min exceed the 220min total unknown brick.
    expect(result.percentageBounds.bike).toEqual([35,57]);
    expect(result.percentageBounds.run).toEqual([25,47]);
    expect(result.provableOutOfBandSports).toEqual([]);
    expect(result.minimumUnknownAllocationSec).toEqual({bike:9000,run:9000});
    expect(result.jointlyFeasible).toBe(false);
    expect(result.status).toBe("incompatible_for_any_brick_allocation");
  });

  it("stays inconclusive when any endurance duration is absent, even if others fit",()=>{
    const result=examineD110TimeRatio([
      {sport:"swim",durationMin:40},{sport:"bike",durationMin:100},
      {sport:"run",durationMin:null},{sport:"brick",durationMin:50},
    ]);
    expect(result.status).toBe("inconclusive_missing_time");
    expect(result.denominatorSec).toBeNull();
    expect(result.jointlyFeasible).toBeNull();
    expect(result.percentageBounds).toEqual({swim:null,bike:null,run:null});
    expect(result.canCertifyPlan).toBe(false);
  });

  it("records fully observed vs possibly compatible without claiming policy validation",()=>{
    const exact=examineD110TimeRatio([
      {sport:"swim",durationMin:18},{sport:"bike",durationMin:45},
      {sport:"run",durationMin:35},{sport:"brick",durationMin:2,
        brickComponents:{bikeMin:1,runMin:0.5,transitionMin:0.5,verified:true}},
    ]);
    expect(exact.status).toBe("fully_accounted_inside_bands");
    expect(exact.canCertifyPlan).toBe(false);
    expect(exact.policyActivated).toBe(false);
    const unknown=examineD110TimeRatio([
      {sport:"swim",durationMin:18},{sport:"bike",durationMin:45},
      {sport:"run",durationMin:30},{sport:"brick",durationMin:7},
    ]);
    expect(unknown.status).toBe("potentially_compatible_unverified_brick");
    expect(unknown.canCertifyPlan).toBe(false);
    expect(()=>examineD110TimeRatio([],Number.NaN)).toThrow("D110_INVALID_TOLERANCE");
  });

  it("replays the actual three D1.2 candidate profiles and publishes interval evidence, no GO",()=>{
    const rows=examineD110ThreeProfiles();
    expect(rows.map(r=>r.profile)).toEqual(["aerobic_dominant","glycolytic_dominant","balanced_typical"]);
    expect(rows.map(r=>r.nativeCriticalCount)).toEqual([3,4,4]);
    expect(rows.map(r=>r.nominal.percentageBounds.swim?.[0])).toEqual([16.9,17.6,17.9]);
    expect(rows.map(x=>x.sourceStage1.status)).toEqual([
      "verified_planned_components","verified_planned_components","verified_planned_components",
    ]);
    expect(rows.map(x=>x.sourceStage1.count)).toEqual([3,3,3]);
    expect(rows.map(x=>x.sourceConditionedNominal?.status)).toEqual([
      "fully_accounted_outside_bands","fully_accounted_outside_bands","fully_accounted_inside_bands",
    ]);
    expect(rows.map(x=>x.sourceConditionedPlus3?.status)).toEqual([
      "fully_accounted_inside_bands","fully_accounted_inside_bands","fully_accounted_inside_bands",
    ]);
    expect(rows.map(x=>x.sourceConditionedNominal?.percentageBounds)).toEqual([
      {swim:[16.9,16.9],bike:[51.6,51.6],run:[31.5,31.5]},
      {swim:[17.6,17.6],bike:[52.7,52.7],run:[29.7,29.7]},
      {swim:[17.9,17.9],bike:[48.2,48.2],run:[33.9,33.9]},
    ]);
    for(const row of rows) {
      expect(row.nominal.denominatorSec).toBeGreaterThan(0);
      expect(row.nominal.evidenceReasons).toContain("brick_components_unverified");
      expect(row.nominal.policyActivated).toBe(false);
      expect(row.withNativeThreePointToleranceAsHypothesis.canCertifyPlan).toBe(false);
      expect(row.stillRequiresPolicyArbitration).toBe(true);
      expect(row.sportApproved).toBe(false);
    }
    console.log("D110_COHORT_INTERVAL_EVIDENCE="+JSON.stringify(rows.map(r=>({
      profile:r.profile,nominal:r.nominal.status,
      with3:r.withNativeThreePointToleranceAsHypothesis.status,
      with8:r.withNativeEightPointCriticalMarginAsHypothesis.status,
      bounds:r.nominal.percentageBounds,
      outside3:r.withNativeThreePointToleranceAsHypothesis.provableOutOfBandSports,
      minimumBrickAllocationSec:r.nominal.minimumUnknownAllocationSec,
      unknownBrickSec:r.nominal.unknownBrickSec,
      originalCritical:r.nativeCriticalCount,
      sourceStage1:r.sourceStage1,
      sourceConstrained:r.sourceConditionedNominal?.percentageBounds,
      sourceConstrainedNominal:r.sourceConditionedNominal?.status,
      sourceConstrainedWith3:r.sourceConditionedPlus3?.status,
    }))));
  });
});

describe("D1.10b: V1 Stage1 source precision never invented",()=>{
  it("derives a unique PLANNED split only for exactly 60min and unchanged V1 fields",()=>{
    const source=WorkoutLibrary.find(w=>w.id==="BRICK_STAGE1_INTRO");
    expect(source).toBeDefined();
    expect(isD110Stage1SourceUnchanged(source)).toBe(true);
    const result=deriveD110PlannedStage1Brick("BRICK_STAGE1_INTRO",60);
    expect(result.ok).toBe(true);
    if(result.ok){
      expect(result.components).toEqual({bikeMin:45,runMin:15,transitionMin:0,verified:true});
      expect(result.executionAttested).toBe(false);
      expect(result.individualDoseApproved).toBe(false);
    }
    expect(deriveD110PlannedStage1Brick("BRICK_STAGE1_INTRO",70).ok).toBe(false);
    expect(deriveD110PlannedStage1Brick("BRICK_STAGE2_BUILD",60).ok).toBe(false);
  });
  it("fail-closes on any tampering or unsupported historical source in an aggregate",()=>{
    const source=WorkoutLibrary.find(w=>w.id==="BRICK_STAGE1_INTRO");
    expect(source).toBeDefined();
    if(!source)return;
    const modified=structuredClone(source);
    modified.structure[0].text="45–70' Z2 facile";
    expect(isD110Stage1SourceUnchanged(modified)).toBe(false);
    const combined=attachD110SourceBrickProof([
      {sport:"swim",id:"B_SWIM",minutes:30},
      {sport:"brick",id:"BRICK_STAGE2_BUILD",minutes:60},
    ]);
    expect(combined).toEqual({ok:false,reasons:["not_stage1_source"]});
  });
});
