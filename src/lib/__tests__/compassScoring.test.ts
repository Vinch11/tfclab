import { describe, it, expect } from "vitest";
import {
  computeCapaciteAerobie,
  computeToleranceEffort,
  computeProfilMetabolique,
} from "@/lib/compassScoring";
import type { TTEEffectif } from "@/lib/tteEffectif";
import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";

// =============================================
// HELPERS
// =============================================

function makeTTE(tte_min: number, source: "observed" | "estimated" | "unknown" = "observed", confidence = 0.9): TTEEffectif {
  return { tte_min, source, confidence, label: `${tte_min} min` };
}

function makeVLamax(value: number | null, source: "test" | "snapshot" | "estimated" | "unknown" = "test", confidence = 0.8): VLamaxEffectif {
  return { value, source, confidence, label: value ? `${value.toFixed(2)}` : "—" };
}

// =============================================
// AXE 1: CAPACITÉ AÉROBIE (FTP/kg)
// =============================================

describe("computeCapaciteAerobie", () => {
  it("returns score 0 when FTP is null", () => {
    const result = computeCapaciteAerobie(null, 75, "IM");
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("returns score 0 when poids is null", () => {
    const result = computeCapaciteAerobie(280, null, "IM");
    expect(result.score).toBe(0);
  });

  it("returns score 0 when poids is 0", () => {
    const result = computeCapaciteAerobie(280, 0, "IM");
    expect(result.score).toBe(0);
  });

  it("IM Elite — FTP 280W, 70kg → ~4.0 W/kg → high score", () => {
    const result = computeCapaciteAerobie(280, 70, "IM");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("AG Finisher — FTP 180W, 80kg → 2.25 W/kg → low score for IM", () => {
    const result = computeCapaciteAerobie(180, 80, "IM");
    expect(result.score).toBeLessThan(70);
  });

  it("score is clamped to 100 max", () => {
    // Very high FTP/kg
    const result = computeCapaciteAerobie(400, 60, "Sprint");
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("score is clamped to 0 min", () => {
    const result = computeCapaciteAerobie(50, 100, "IM");
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("higher FTP/kg → higher score for same objectif", () => {
    const low = computeCapaciteAerobie(200, 80, "IM");
    const high = computeCapaciteAerobie(280, 70, "IM");
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("provides formula string for staff traceability", () => {
    const result = computeCapaciteAerobie(280, 70, "IM");
    expect(result.formula).toContain("FTP_score");
    expect(result.formula).toContain("4.00");
  });
});

// =============================================
// AXE 2: TOLÉRANCE À L'EFFORT (TTE)
// =============================================

describe("computeToleranceEffort", () => {
  it("returns score 0 when TTE source is unknown", () => {
    const result = computeToleranceEffort(makeTTE(45, "unknown", 0.2), "IM");
    expect(result.score).toBe(0);
  });

  it("IM — TTE 50 min vs cible ~55 → score < 100", () => {
    const result = computeToleranceEffort(makeTTE(50), "IM");
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("IM — TTE 60 min → excellent score", () => {
    const result = computeToleranceEffort(makeTTE(60), "IM");
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("TTE 25 min for IM → low score", () => {
    const result = computeToleranceEffort(makeTTE(25), "IM");
    expect(result.score).toBeLessThan(60);
  });

  it("higher TTE → higher score for same objectif", () => {
    const low = computeToleranceEffort(makeTTE(30), "IM");
    const high = computeToleranceEffort(makeTTE(55), "IM");
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("preserves confidence from input", () => {
    const result = computeToleranceEffort(makeTTE(50, "estimated", 0.65), "IM");
    expect(result.confidence).toBe(0.65);
  });
});

// =============================================
// AXE 3: PROFIL MÉTABOLIQUE (VLamax)
// =============================================

describe("computeProfilMetabolique", () => {
  it("returns score 0 when VLamax is null", () => {
    const result = computeProfilMetabolique(makeVLamax(null, "unknown", 0), "IM");
    expect(result.score).toBe(0);
  });

  it("IM — VLamax 0.25 (optimal) → score 100", () => {
    const result = computeProfilMetabolique(makeVLamax(0.25), "IM");
    expect(result.score).toBe(100);
  });

  it("IM — VLamax 0.50 (au-dessus optimal 0.25) → score dégradé mais non nul", () => {
    const result = computeProfilMetabolique(makeVLamax(0.50), "IM");
    // 0.50 est au-dessus de la cible endurance IM (~0.25). Score dégradé attendu (20-70).
    expect(result.score).toBeGreaterThan(20);
    expect(result.score).toBeLessThan(80);
  });

  it("IM — VLamax 0.80 (too high) → low score", () => {
    const result = computeProfilMetabolique(makeVLamax(0.80), "IM");
    expect(result.score).toBeLessThan(60);
  });

  it("lower VLamax → higher score for endurance objectif", () => {
    const low = computeProfilMetabolique(makeVLamax(0.30), "IM");
    const high = computeProfilMetabolique(makeVLamax(0.60), "IM");
    expect(low.score).toBeGreaterThanOrEqual(high.score);
  });

  it("score is always within [0, 100]", () => {
    const veryHigh = computeProfilMetabolique(makeVLamax(1.2), "IM");
    const veryLow = computeProfilMetabolique(makeVLamax(0.10), "IM");
    expect(veryHigh.score).toBeGreaterThanOrEqual(0);
    expect(veryHigh.score).toBeLessThanOrEqual(100);
    expect(veryLow.score).toBeGreaterThanOrEqual(0);
    expect(veryLow.score).toBeLessThanOrEqual(100);
  });

  it("preserves confidence from input", () => {
    const result = computeProfilMetabolique(makeVLamax(0.40, "estimated", 0.55), "IM");
    expect(result.confidence).toBe(0.55);
  });
});
