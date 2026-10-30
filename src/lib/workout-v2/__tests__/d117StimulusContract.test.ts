import {describe, expect, it} from "vitest";
import {examineD117Stimulus, type RequiredStimulus} from "../../../../experimental/workout-v2/d117StimulusContract";

describe("D1.17: a key calendar slot is not a physiological dose", () => {
  it("never upgrades recovery or unknown intent to threshold or VO2max on a key day", () => {
    for (const stimulus of ["threshold","vo2max"] as const) {
      expect(examineD117Stimulus(stimulus,{documented:"recovery",provenance:"curated_card"},true).compatible).toBe(false);
      expect(examineD117Stimulus(stimulus,{documented:"unknown",provenance:"missing"},true).compatible).toBe(false);
    }
  });
  it("the calendar key flag never changes a dose decision", () => {
    for (const required of ["recovery","easy_aerobic","threshold","vo2max"] as RequiredStimulus[]) {
      for (const documented of ["recovery","easy_aerobic","threshold","vo2max","unknown"] as const) {
        const evidence={documented,provenance:"curated_card" as const};
        expect(examineD117Stimulus(required,evidence,true))
          .toEqual(examineD117Stimulus(required,evidence,false));
      }
    }
  });
  it("accepts only a documented exact match, not guessed training stimulus", () => {
    expect(examineD117Stimulus("threshold",{documented:"threshold",provenance:"curated_card"},true).compatible).toBe(true);
    expect(examineD117Stimulus("recovery",{documented:"vo2max",provenance:"curated_card"},false).compatible).toBe(false);
    expect(examineD117Stimulus("vo2max",{documented:"vo2max",provenance:"missing"},true).compatible).toBe(false);
  });
});
