import { describe, expect, it } from "vitest";
import { WORKOUT_V2_MODELS } from "../../../../experimental/workout-v2/catalog";
import { fitWorkoutV2ToDuration } from "../../../../experimental/workout-v2/fit";
import type { WorkoutV2Input } from "../../../../experimental/workout-v2/instantiate";
import { previewV2InPlan } from "../../../../experimental/workout-v2/planBridge";

function i(id:string):WorkoutV2Input{
  const model=WORKOUT_V2_MODELS.find(m=>m.id===id)!;
  return {
    goal:model.goals.includes("half")?"half":model.goals[0],
    phase:model.phases.includes("base")?"base":model.phases[0],
    level:model.minTrainingLevel,
    pain:false,recoveryConcern:false,readiness:"ready",
    anchors:{
      ftpW:{value:280,verified:true,sport:"bike"},
      vmaKmh:{value:16,verified:true,sport:"run"},
      thresholdPaceSecKm:{value:250,verified:true,sport:"run"},
      cssSecPer100m:{value:95,verified:true,sport:"swim"},
    }
  };
}
describe("V2 exact duration fitter, isolated pilot",()=>{
  it("fits a Foundation half brick to 100min without impersonating the V1 race-pace brick",()=>{
    const a=fitWorkoutV2ToDuration("V2_BRICK_01",i("V2_BRICK_01"),6000);
    const b=fitWorkoutV2ToDuration("V2_BRICK_01",i("V2_BRICK_01"),6000);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
    if(a.ok===false)return;
    expect(a.candidate.plannedDurationSec).toBe(6000);
    expect(a.candidate.status).toBe("coach_review_required");
    expect(a.candidate.steps.reduce((n,s)=>n+s.durationSec,0)).toBe(6000);
    expect(a.selected.bikeSec).toBe(4020);
    expect(a.candidate.steps.some(x=>x.sport==="run")).toBe(true);
    expect(a.candidate.steps.some(x=>x.sport==="bike")).toBe(true);
    const preview=previewV2InPlan(a.candidate,"samedi");
    expect(preview.ok).toBe(true);
    if(preview.ok) {
      expect(preview.preview.planSession.custom).toBe(true);
      expect(preview.preview.planSession.catalogId).toBeNull();
      expect(preview.preview.canAutoInsert).toBe(false);
      expect(preview.preview.canExportNolio).toBe(false);
      expect(preview.preview.sourceV1Id).toBe("BRICK_STAGE1_INTRO");
    }
  });
  it("fits 70min threshold bike without changing the requested intensity, goal or phase",()=>{
    const r=fitWorkoutV2ToDuration("V2_BIKE_02",i("V2_BIKE_02"),4200);
    expect(r.ok).toBe(true);
    if(r.ok===false)return;
    expect(r.candidate.plannedDurationSec).toBe(4200);
    expect(r.candidate.goal).toBe("half");
    expect(r.candidate.phase).toBe("base");
    expect(r.candidate.steps.some(s=>s.target?.unit==="W")).toBe(true);
  });
  it("never forces a too-short workout by altering intensity/recovery or dropping steps",()=>{
    const r=fitWorkoutV2ToDuration("V2_BIKE_02",i("V2_BIKE_02"),60);
    expect(r.ok).toBe(false);
    if(r.ok===false)expect(r.reasons).toContain("no_exact_recipe_within_declared_knobs");
  });
  it("refuses profile and recovery issues before searching any dosage variant",()=>{
    const r=fitWorkoutV2ToDuration("V2_BRICK_01",{...i("V2_BRICK_01"),pain:true},6000);
    expect(r).toEqual({ok:false,reasons:["pain_present"],attempts:0});
    expect(fitWorkoutV2ToDuration("V2_BRICK_01",i("V2_BRICK_01"),6000.5))
      .toEqual({ok:false,reasons:["invalid_target_seconds"],attempts:0});
  });
  it("does not exceed declared availability even when target is a known recipe",()=>{
    const r=fitWorkoutV2ToDuration("V2_BRICK_01",{...i("V2_BRICK_01"),maxDurationSec:5400},6000);
    expect(r).toEqual({ok:false,reasons:["time_budget_exceeded"],attempts:0});
  });
});
