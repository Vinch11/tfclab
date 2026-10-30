import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { zSession } from "@/lib/plan/planSchema";
import { WORKOUT_V2_MODELS } from "../../../../experimental/workout-v2/catalog";
import { instantiateWorkoutV2, type WorkoutV2Input } from "../../../../experimental/workout-v2/instantiate";
import { WORKOUT_V1_TO_V2, workoutV1Coverage, findV2ModelsInspiredByV1, sourceV1CanAutoReplace } from "../../../../experimental/workout-v2/v1Lineage";
import { previewV2InPlan } from "../../../../experimental/workout-v2/planBridge";

const anchors: NonNullable<WorkoutV2Input["anchors"]> = {
  ftpW: { value: 270, verified: true, sport: "bike" },
  vmaKmh: { value: 16, verified: true, sport: "run" },
  thresholdPaceSecKm: { value: 250, verified: true, sport: "run" },
  cssSecPer100m: { value: 95, verified: true, sport: "swim" },
};
function input(id: string): WorkoutV2Input {
  const model = WORKOUT_V2_MODELS.find(m=>m.id===id)!;
  return {goal:model.goals[0],phase:model.phases[0],level:model.minTrainingLevel,
    readiness:"ready",pain:false,recoveryConcern:false,anchors};
}

describe("V1 heritage to V2: no false equivalence", () => {
  it("maps every one of the 20 V2 models onto an actual V1 catalogue record",()=>{
    expect(WORKOUT_V1_TO_V2).toHaveLength(20);
    expect(workoutV1Coverage()).toEqual({linked:20,models:20,unmapped:[]});
    const v1Ids = new Set(WorkoutLibrary.map(x=>x.id));
    const v2Ids = new Set(WORKOUT_V2_MODELS.map(x=>x.id));
    const mapped = new Set(WORKOUT_V1_TO_V2.map(x=>x.v2Id));
    expect(mapped).toEqual(v2Ids);
    for(const x of WORKOUT_V1_TO_V2) {
      expect(v1Ids.has(x.sourceV1Id), x.sourceV1Id).toBe(true);
      expect(x.relationship).toBe("inspired_by_not_equivalent");
      expect(x.discrepancy.length).toBeGreaterThan(25);
      expect(x.review).toBe("required");
      expect(findV2ModelsInspiredByV1(x.sourceV1Id)).toContain(x.v2Id);
      expect(sourceV1CanAutoReplace(x.sourceV1Id, "half")).toBe(false);
    }
  });
  it("preserves seconds and V1 provenance in a custom draft, never claims a catalogue ID",()=>{
    const generated = instantiateWorkoutV2("V2_BIKE_02",input("V2_BIKE_02"));
    expect(generated.ok).toBe(true);
    if(!generated.ok)return;
    const r=previewV2InPlan(generated.candidate,"mardi");
    expect(r.ok).toBe(true);
    if(!r.ok)return;
    const {preview}=r;
    expect(preview.status).toBe("coach_review_required");
    expect(preview.canAutoInsert).toBe(false);
    expect(preview.canExportNolio).toBe(false);
    expect(preview.sourceV1Id).toBe("B_BIKE_THRESHOLD_2x20");
    expect(preview.planSession.custom).toBe(true);
    expect(preview.planSession.catalogId).toBeNull();
    expect(preview.planSession.durationMin*60).toBe(preview.plannedDurationSec);
    expect(preview.exactSteps.reduce((n,s)=>n+s.durationSec,0)).toBe(preview.plannedDurationSec);
    expect(preview.planSession.details).toContain("CANDIDAT V2");
    expect(preview.planSession.details).toContain("inspiration seulement");
    expect(zSession.safeParse(preview.planSession).success).toBe(true);
  });
  it("rejects swim CSS 43m50s instead of rounding a minute for legacy zSession",()=>{
    const outcome=instantiateWorkoutV2("V2_SWIM_02",input("V2_SWIM_02"));
    expect(outcome.ok).toBe(true);
    if(!outcome.ok)return;
    expect(outcome.candidate.plannedDurationSec % 60).not.toBe(0);
    expect(previewV2InPlan(outcome.candidate,"jeudi"))
      .toEqual({ok:false,reasons:["legacy_plan_schema_cannot_represent_exact_seconds"]});
  });
  it("marks a base-phase brick candidate as CUSTOM, never launders a Build/Peak V1 brick ID",()=>{
    const outcome=instantiateWorkoutV2("V2_BRICK_01",input("V2_BRICK_01"));
    expect(outcome.ok).toBe(true);
    if(!outcome.ok)return;
    const bridge=previewV2InPlan(outcome.candidate,"samedi");
    expect(bridge.ok).toBe(true);
    if(!bridge.ok)return;
    expect(bridge.preview.planSession.custom).toBe(true);
    expect(bridge.preview.planSession.catalogId).toBeNull();
    expect(bridge.preview.sourceV1Id).toBe("BRICK_IM_Z2_RUN");
    const original = WorkoutLibrary.find(x=>x.id===bridge.preview.sourceV1Id)!;
    expect(original.phase).not.toContain("base");
    expect(bridge.preview.canAutoInsert).toBe(false);
  });
  it("rejects forged model and invalid schedule, without exporting",()=>{
    const outcome=instantiateWorkoutV2("V2_RUN_02",input("V2_RUN_02"));
    expect(outcome.ok).toBe(true);
    if(!outcome.ok)return;
    expect(previewV2InPlan({...outcome.candidate,modelId:"FAKE_V1"},"lundi"))
      .toEqual({ok:false,reasons:["provenance_v1_unavailable"]});
    expect(previewV2InPlan({...outcome.candidate,plannedDurationSec:outcome.candidate.plannedDurationSec+60},"lundi"))
      .toEqual({ok:false,reasons:["invalid_exact_schedule"]});
  });
});
