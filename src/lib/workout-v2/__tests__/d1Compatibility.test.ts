import { describe, expect, it } from "vitest";
import { WORKOUT_V2_MODELS } from "../../../../experimental/workout-v2/catalog";
import { instantiateWorkoutV2, type WorkoutV2Input } from "../../../../experimental/workout-v2/instantiate";
import { fitWorkoutV2ToDuration } from "../../../../experimental/workout-v2/fit";
import { D1_BASE_SLOT_CONTRACTS, diagnoseD1Stage1StructuralConflict, reviewD1BrickCandidate } from "../../../../experimental/workout-v2/d1Compatibility";

const params: WorkoutV2Input = {
  goal:"half", phase:"base", level:"trained", readiness:"ready", pain:false,
  recoveryConcern:false,anchors:{}, maxDurationSec:undefined,
};
describe("D1: V2 fitting must not change proven Stage 1 and slot contracts",()=>{
  it("uses exactly four D1.1 floors (S1–S4), with unmodified source max 60min bike/90min total",()=>{
    expect(D1_BASE_SLOT_CONTRACTS.map(c=>[
      c.minBikeExerciseSec/60,c.minBrickElapsedSec/60])).toEqual([
        [70,90],[80,100],[85,105],[70,90],
      ]);
    const diagnostic=diagnoseD1Stage1StructuralConflict();
    expect(diagnostic).toHaveLength(4);
    expect(diagnostic.map(x=>x.bikeConflict)).toEqual([true,true,true,true]);
    expect(diagnostic.map(x=>x.totalConflict)).toEqual([false,true,true,false]);
    expect(diagnostic.every(x=>x.outcome==="refused")).toBe(true);
  });
  it("the new 100min V2 fit is EXACT but ineligible under BOTH S2 source and bike floor",()=>{
    const fit=fitWorkoutV2ToDuration("V2_BRICK_01",params,100*60);
    expect(fit.ok).toBe(true);
    if(fit.ok===false)return;
    expect(fit.candidate.plannedDurationSec).toBe(6000);
    const review=reviewD1BrickCandidate(fit.candidate,D1_BASE_SLOT_CONTRACTS[1]);
    expect(review.status).toBe("refused");
    expect(review.bikeExerciseSec/60).toBe(77); // 10min bike warmup + 67min bike main
    expect(review.elapsedSec/60).toBe(100);
    expect(review.reasons).toEqual(expect.arrayContaining([
      "stage1_source_total_out_of_bounds",
      "stage1_source_bike_out_of_bounds",
      "d1_long_bike_component_not_met",
    ]));
    expect(review.canAutoInsert).toBe(false);
    expect(review.individualPrescriptionApproved).toBe(false);
  });
  it("no candidate fitted to the four D1 minimums is permitted to masquerade as source-approved",()=>{
    for(const slot of D1_BASE_SLOT_CONTRACTS){
      const fit=fitWorkoutV2ToDuration("V2_BRICK_01",params,slot.minBrickElapsedSec);
      expect(fit.ok,`S${slot.week}`).toBe(true);
      if(fit.ok===false)continue;
      const reviewed=reviewD1BrickCandidate(fit.candidate,slot);
      expect(reviewed.status,`S${slot.week}`).toBe("refused");
      expect(reviewed.reasons.length).toBeGreaterThan(0);
    }
  });
  it("a source-compatible 83min short brick still correctly fails D1 long-bike floor",()=>{
    const compiled=instantiateWorkoutV2("V2_BRICK_01",{...params,parameters:{bikeSec:3000}});
    expect(compiled.ok).toBe(true);
    if(compiled.ok===false)return;
    expect(compiled.candidate.plannedDurationSec/60).toBe(83);
    const gate=reviewD1BrickCandidate(compiled.candidate,D1_BASE_SLOT_CONTRACTS[0]);
    expect(gate.bikeExerciseSec/60).toBe(60);
    expect(gate.runExerciseSec/60).toBe(20);
    expect(gate.reasons).toContain("d1_long_bike_component_not_met");
    expect(gate.reasons).toContain("d1_brick_minimum_not_met");
    expect(gate.reasons).not.toContain("stage1_source_bike_out_of_bounds");
    expect(gate.reasons).not.toContain("stage1_source_total_out_of_bounds");
  });
  it("a hypothetical smaller DIFFERENT slot can be source-compatible but never automatically approved",()=>{
    const compiled=instantiateWorkoutV2("V2_BRICK_01",{...params,parameters:{bikeSec:3000}});
    expect(compiled.ok).toBe(true);
    if(compiled.ok===false)return;
    // This gate only accepts exactly pinned D1 floors: invented hypothetical slots MUST reject.
    const gate=reviewD1BrickCandidate(compiled.candidate,{week:1,minBikeExerciseSec:60*60,minBrickElapsedSec:80*60,availableSec:600*60});
    expect(gate.status).toBe("refused");
    expect(gate.reasons).toContain("d1_contract_not_pinned");
  });
  it("tampered lineage, objective or candidate schedule cannot unlock the D1 gate",()=>{
    const fit=fitWorkoutV2ToDuration("V2_BRICK_01",params,90*60);
    expect(fit.ok).toBe(true);
    if(fit.ok===false)return;
    const original=fit.candidate;
    const faked=reviewD1BrickCandidate({...original,modelId:"V2_BRICK_02",goal:"ironman",plannedDurationSec:original.plannedDurationSec+1},D1_BASE_SLOT_CONTRACTS[0]);
    expect(faked.status).toBe("refused");
    expect(faked.reasons).toEqual(expect.arrayContaining(["candidate_not_stage1_base_703","candidate_exact_time_invalid"]));
  });
  it("retains 20 models; compatibility review does not add/retag any catalogue source",()=>{
    expect(WORKOUT_V2_MODELS).toHaveLength(20);
  });
});
