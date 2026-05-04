import { describe, it, expect } from "vitest";
import {
  predictRunMLSSPctFromVLaCE,
  crossValidateRunMLSS,
} from "../runMLSSPredictor";

describe("predictRunMLSSPctFromVLaCE — Modèle C (N=14 run)", () => {
  it("returns null when inputs missing", () => {
    expect(predictRunMLSSPctFromVLaCE(null, 200)).toBeNull();
    expect(predictRunMLSSPctFromVLaCE(0.4, null)).toBeNull();
    expect(predictRunMLSSPctFromVLaCE(0, 200)).toBeNull();
  });

  it("Elite marathonien (VLa 0.30, CE 190) → MLSS ~88-92%", () => {
    const r = predictRunMLSSPctFromVLaCE(0.30, 190)!;
    expect(r.mlssPct).toBeGreaterThanOrEqual(88);
    expect(r.mlssPct).toBeLessThanOrEqual(92);
  });

  it("Coureur amateur équilibré (VLa 0.45, CE 210) → MLSS ~80-86%", () => {
    const r = predictRunMLSSPctFromVLaCE(0.45, 210)!;
    expect(r.mlssPct).toBeGreaterThanOrEqual(80);
    expect(r.mlssPct).toBeLessThanOrEqual(86);
  });

  it("Profil glycolytique (VLa 0.65, CE 220) → MLSS ~73-78%", () => {
    const r = predictRunMLSSPctFromVLaCE(0.65, 220)!;
    expect(r.mlssPct).toBeGreaterThanOrEqual(73);
    expect(r.mlssPct).toBeLessThanOrEqual(78);
  });

  it("CE élevé pénalise le MLSS pour même VLamax", () => {
    const efficient = predictRunMLSSPctFromVLaCE(0.40, 185)!;
    const wasteful = predictRunMLSSPctFromVLaCE(0.40, 230)!;
    expect(wasteful.mlssPct).toBeLessThan(efficient.mlssPct);
  });

  it("VLamax élevée pénalise le MLSS pour même CE", () => {
    const aerobic = predictRunMLSSPctFromVLaCE(0.30, 200)!;
    const glyco = predictRunMLSSPctFromVLaCE(0.60, 200)!;
    expect(glyco.mlssPct).toBeLessThan(aerobic.mlssPct);
  });

  it("confidence drops at extremes", () => {
    const central = predictRunMLSSPctFromVLaCE(0.40, 200)!;
    const extreme = predictRunMLSSPctFromVLaCE(0.90, 250)!;
    expect(extreme.confidence).toBeLessThan(central.confidence);
  });

  it("trace exposes formula and contributions", () => {
    const r = predictRunMLSSPctFromVLaCE(0.40, 200)!;
    expect(r.trace.formula).toContain("0.337");
    expect(r.trace.rmseExpected).toBe(2.64);
  });
});

describe("crossValidateRunMLSS", () => {
  it("returns null if prediction impossible", () => {
    expect(crossValidateRunMLSS(85, null, 200)).toBeNull();
  });

  it("OK when observed close to predicted", () => {
    // VLa 0.40, CE 200 → predicted ~86.5%
    const cv = crossValidateRunMLSS(86, 0.40, 200)!;
    expect(cv.severity).toBe("ok");
    expect(cv.isCoherent).toBe(true);
  });

  it("WARNING for moderate deviation (5-10%)", () => {
    const cv = crossValidateRunMLSS(78, 0.40, 200)!;
    expect(cv.severity).toBe("warning");
    expect(cv.isCoherent).toBe(false);
  });

  it("CRITICAL for major deviation (>10%)", () => {
    const cv = crossValidateRunMLSS(70, 0.40, 200)!;
    expect(cv.severity).toBe("critical");
  });

  it("delta sign drives explanation direction", () => {
    const above = crossValidateRunMLSS(95, 0.40, 200)!;
    const below = crossValidateRunMLSS(75, 0.40, 200)!;
    expect(above.deltaPct).toBeGreaterThan(0);
    expect(below.deltaPct).toBeLessThan(0);
  });
});
