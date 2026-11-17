import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "../../workoutLibrary";
import { parsePrescription, prescriptionSeconds } from "../../../../supabase/functions/_shared/nolioPrescription";

describe("audited catalogue recipes have one executable dose",()=>{
  for(const [id,minutes] of [["B_RUN_TEMPO_PROGRESSIVE",50],["V3_BIKE_SST_PROGRESSIF",85]] as const){
    it(id,()=>{
      const card=WorkoutLibrary.find(w=>w.id===id);
      expect(card).toBeDefined();
      expect(card?.durationMin).toEqual([minutes,minutes]);
      const seconds=card!.structure.reduce((sum,p)=>sum+prescriptionSeconds(parsePrescription(p.text))!,0);
      expect(seconds).toBe(minutes*60);
    });
  }
});
