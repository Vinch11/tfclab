import { describe, it, expect } from "vitest";
import { resolveSessionDurationRanges, checkRemainingDurationRanges } from "../resolveDurationRanges";
import { isKeySessionObjectiveMismatch } from "../keySessionObjective";

describe("durée unique par séance", () => {
  it("Vince S5 : 10' + 20–70 min Z2 + 5' sur 35 min → corps 20 min, volume 35", () => {
    const r = resolveSessionDurationRanges({ details: "Warm-up: 10 min Z1–Z2 relâché | Main: 20–70 min Z2 | Cool-down: 5 min Z1", durationMin: 35, phase: "peak" })!;
    expect(r.details).toContain("Main: 20 min Z2");
    expect(r.durationMin).toBe(35);
    expect(checkRemainingDurationRanges({ weeks: [{ weekNumber: 5, sessions: [{ details: r.details }] }] })).toHaveLength(0);
  });
  it("20–35' Z1 sur 25 min → 25'", () => {
    expect(resolveSessionDurationRanges({ details: "Main: 20–35' Z1 très facile", durationMin: 25 })!.details).toBe("Main: 25' Z1 très facile");
  });
  it("sans durée prévue, affûtage = bas de tranche et volume recalculé", () => {
    const r = resolveSessionDurationRanges({ details: "Main: 40-60 min Z2", durationMin: 0, phase: "taper" })!;
    expect(r.details).toBe("Main: 45 min Z2");
    expect(r.durationMin).toBe(45);
  });
  it("une tranche restante est signalée", () => {
    expect(checkRemainingDurationRanges({ weeks: [{ weekNumber: 2, sessions: [{ details: "45-70 min Z2" }] }] })).toHaveLength(1);
  });
});

describe("séance clé compatible avec l'objectif", () => {
  it("fiche non prévue pour le 10 km (A_RUN_Z2_EASY) = incompatible en séance clé 10 km", () => {
    expect(isKeySessionObjectiveMismatch("A_RUN_Z2_EASY", "10K")).toBe(true);
  });
  it("même fiche dans un plan marathon = compatible", () => {
    expect(isKeySessionObjectiveMismatch("A_RUN_Z2_EASY", "Marathon")).toBe(false);
  });
});
