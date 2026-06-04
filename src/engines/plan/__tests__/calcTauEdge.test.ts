import { describe, it, expect } from "vitest";
import {
  calcTauEdge,
  calcRecoveryEdge,
} from "../../../../supabase/functions/ai-training-plan/promptHelpers";
import { calculateTau } from "@/lib/v2/criticalPowerModel";

// F-07 — edge calcTau aligned with client-side calculateTau.
// These tests pin the two implementations together and lock in the defensive
// behaviour when recPow ≥ CP.

describe("F-07 — calcTauEdge ↔ calculateTau parity", () => {
  const CP = 280;

  it("returns identical τ values for passive rest (0 W)", () => {
    expect(calcTauEdge(CP, 0)).toBeCloseTo(calculateTau(CP, 0), 6);
  });

  it("returns identical τ values for active-light recovery (50% CP)", () => {
    const recPow = Math.round(CP * 0.5);
    expect(calcTauEdge(CP, recPow)).toBeCloseTo(calculateTau(CP, recPow), 6);
  });

  it("returns identical τ values for active-tempo recovery (70% CP)", () => {
    const recPow = Math.round(CP * 0.7);
    expect(calcTauEdge(CP, recPow)).toBeCloseTo(calculateTau(CP, recPow), 6);
  });

  it("returns Infinity when recPow === CP (no reconstitution possible)", () => {
    expect(calcTauEdge(CP, CP)).toBe(Infinity);
    expect(calculateTau(CP, CP)).toBe(Infinity);
  });

  it("returns Infinity when recPow > CP (defensive)", () => {
    expect(calcTauEdge(CP, CP + 50)).toBe(Infinity);
    expect(calculateTau(CP, CP + 50)).toBe(Infinity);
  });

  it("respects the 200..1500 s physiological bounds", () => {
    // Very small DCP → would explode beyond 1500
    expect(calcTauEdge(CP, CP - 1)).toBeLessThanOrEqual(1500);
    // Very large DCP → would collapse under 200
    expect(calcTauEdge(2000, 0)).toBeGreaterThanOrEqual(200);
  });
});

describe("F-07 — calcRecoveryEdge handles recPow ≥ CP without diverging", () => {
  const CP = 280;
  const W_EFF = 20_000; // 20 kJ effective W'

  it("falls back to passive rest when recPow === CP (finite, non-zero rest)", () => {
    const passive = calcRecoveryEdge(CP, W_EFF, Math.round(CP * 1.2), 30, 0);
    const degenerate = calcRecoveryEdge(CP, W_EFF, Math.round(CP * 1.2), 30, CP);
    expect(Number.isFinite(degenerate.rest)).toBe(true);
    expect(degenerate.rest).toBe(passive.rest);
    expect(degenerate.maxReps).toBe(passive.maxReps);
  });

  it("falls back to passive rest when recPow > CP (defensive guard)", () => {
    const passive = calcRecoveryEdge(CP, W_EFF, Math.round(CP * 1.2), 30, 0);
    const degenerate = calcRecoveryEdge(CP, W_EFF, Math.round(CP * 1.2), 30, CP + 100);
    expect(Number.isFinite(degenerate.rest)).toBe(true);
    expect(degenerate.rest).toBe(passive.rest);
  });

  it("active-tempo recovery (70% CP) prescribes longer rest than passive (0 W)", () => {
    const intPow = Math.round(CP * 1.2);
    const passive = calcRecoveryEdge(CP, W_EFF, intPow, 30, 0);
    const tempo = calcRecoveryEdge(CP, W_EFF, intPow, 30, Math.round(CP * 0.7));
    expect(tempo.rest).toBeGreaterThan(passive.rest);
  });

  it("returns default short rest when intensity ≤ CP (no W' depletion)", () => {
    const res = calcRecoveryEdge(CP, W_EFF, CP - 10, 60, 0);
    expect(res.rest).toBe(60);
    expect(res.maxReps).toBe(20);
  });
});
