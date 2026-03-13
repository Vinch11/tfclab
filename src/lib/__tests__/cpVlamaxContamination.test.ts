/**
 * Tests: CP data quality guard on VLamax estimation
 * Ensures implausible/suspect CP data does not contaminate VLamax via Score G or W' cross-validation
 */
import { describe, it, expect } from "vitest";
import { computeVLamaxBikeV2Enhanced } from "../v2/vlamaxBikeV2Enhanced";

// Helper: build a standard input with all power data
const baseInput = {
  ftp: 280,
  pmax_5s: 1100,
  p30s_w: 750,
  p60s_w: 500,
  map5min_w: 330,
  tte_min: 45,
  weight_kg: 75,
  vo2max: 65,
  protocol_quality: 3 as const,
};

describe("CP↔VLamax contamination guard", () => {
  it("returns a result with good data (baseline)", () => {
    const result = computeVLamaxBikeV2Enhanced(baseInput);
    expect(result.value).toBeGreaterThan(0.20);
    expect(result.value).toBeLessThanOrEqual(1.05);
    expect(result.confidence).toBeGreaterThanOrEqual(0.50);
  });

  it("excludes W' cross-validation warning mentions 'implausible' for wildly incoherent short power", () => {
    // P30s way too high relative to P60s/MAP → CP model should flag implausible
    const incoherentInput = {
      ...baseInput,
      p30s_w: 1500, // Absurdly high P30s vs MAP 330W
      p60s_w: 1200, // Also absurdly high
    };
    const result = computeVLamaxBikeV2Enhanced(incoherentInput);
    
    // Should have a warning about CP data quality
    const hasQualityWarning = result.warnings.some(
      w => w.includes("implausible") || w.includes("suspecte") || w.includes("Divergence")
    );
    expect(hasQualityWarning).toBe(true);
  });

  it("VLamax with implausible CP data should not differ drastically from Mader-only estimate", () => {
    // Get Mader-only estimate (no short power data)
    const maderOnlyInput = {
      ftp: 280,
      pmax_5s: 1100,
      weight_kg: 75,
      vo2max: 65,
      tte_min: 45,
      protocol_quality: 3 as const,
    };
    const maderOnly = computeVLamaxBikeV2Enhanced(maderOnlyInput);

    // Now add wildly incoherent short power data
    const incoherentInput = {
      ...maderOnlyInput,
      p30s_w: 1500,
      p60s_w: 1200,
      map5min_w: 330,
    };
    const withBadCP = computeVLamaxBikeV2Enhanced(incoherentInput);

    // The difference should be bounded — bad CP should not pull VLamax far from Mader
    const delta = Math.abs(withBadCP.value - maderOnly.value);
    expect(delta).toBeLessThan(0.15); // Should be within 0.15 mmol/L/s
  });

  it("good CP data includes W' in sources", () => {
    const result = computeVLamaxBikeV2Enhanced(baseInput);
    expect(result.sources).toContain("W'bal");
  });

  it("confidence is penalized when CP data is suspect or implausible", () => {
    const goodResult = computeVLamaxBikeV2Enhanced(baseInput);
    
    const suspectInput = {
      ...baseInput,
      p30s_w: 1500,
      p60s_w: 1200,
    };
    const suspectResult = computeVLamaxBikeV2Enhanced(suspectInput);
    
    // Suspect/implausible data should reduce confidence
    expect(suspectResult.confidence).toBeLessThanOrEqual(goodResult.confidence);
  });
});
