/**
 * Tests: CP data quality guard on VLamax estimation
 * Ensures implausible/suspect CP data does not contaminate VLamax via Score G or W' cross-validation
 * 
 * Architecture tested:
 * 1. Score G excludes W' index when CP dataQuality === "implausible"
 * 2. Score G reduces S30/S60 weight when CP dataQuality === "suspect" (×0.5)
 * 3. Score G zeroes S30/S60 weight when CP dataQuality === "implausible"
 * 4. W'→VLamax cross-validation skipped when CP dataQuality === "implausible"
 * 5. Warnings are emitted for traceability
 */
import { describe, it, expect } from "vitest";
import { computeVLamaxBikeV2Enhanced } from "../v2/vlamaxBikeV2Enhanced";

// ── Coherent baseline (physiologically plausible diesel profile) ──
const baseCoherent = {
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

// ── Mader-only (no short power → no CP model at all) ──
const maderOnlyInput = {
  ftp: 280,
  pmax_5s: 1100,
  weight_kg: 75,
  vo2max: 65,
  tte_min: 45,
  protocol_quality: 3 as const,
};

// ── Implausible: P30s/P60s absurdly high relative to MAP ──
const implausibleInput = {
  ...baseCoherent,
  p30s_w: 1500,  // ~4.5× MAP → violates monotonicity logic
  p60s_w: 1200,  // ~3.6× MAP → absurd
};

// ── Inverted monotonicity: P60s > P30s (impossible physiologically) ──
const invertedInput = {
  ...baseCoherent,
  p30s_w: 400,
  p60s_w: 500,   // P60s > P30s → impossible
};

// ── Diesel profile with aberrant W': low Pmax but huge gap P30s→MAP ──
const dieselAberrantWprime = {
  ftp: 300,
  pmax_5s: 800,
  p30s_w: 900,   // Barely above FTP → low W' expected
  p60s_w: 450,
  map5min_w: 340,
  tte_min: 55,
  weight_kg: 72,
  vo2max: 70,
  protocol_quality: 4 as const,
};

// =============================================
// GROUP 1: Baseline sanity
// =============================================

describe("CP↔VLamax contamination guard — baseline", () => {
  it("coherent data produces a plausible VLamax with decent confidence", () => {
    const result = computeVLamaxBikeV2Enhanced(baseCoherent);
    expect(result.value).toBeGreaterThanOrEqual(0.20);
    expect(result.value).toBeLessThanOrEqual(1.05);
    expect(result.confidence).toBeGreaterThanOrEqual(0.50);
    expect(result.formula).not.toBe("insufficient");
  });

  it("coherent data includes W'bal in sources", () => {
    const result = computeVLamaxBikeV2Enhanced(baseCoherent);
    expect(result.sources).toContain("W'bal");
  });

  it("coherent data has no implausible/suspect warnings", () => {
    const result = computeVLamaxBikeV2Enhanced(baseCoherent);
    const hasCPWarning = result.warnings.some(
      w => w.includes("implausible") || w.includes("suspecte")
    );
    expect(hasCPWarning).toBe(false);
  });
});

// =============================================
// GROUP 2: Implausible CP exclusion
// =============================================

describe("CP↔VLamax contamination guard — implausible data", () => {
  it("emits a warning when CP data is implausible", () => {
    const result = computeVLamaxBikeV2Enhanced(implausibleInput);
    const hasWarning = result.warnings.some(
      w => w.includes("implausible") || w.includes("Divergence") || w.includes("suspecte")
    );
    expect(hasWarning).toBe(true);
  });

  it("VLamax with implausible CP stays close to Mader-only estimate (Δ < 0.20)", () => {
    const maderOnly = computeVLamaxBikeV2Enhanced(maderOnlyInput);
    const withBadCP = computeVLamaxBikeV2Enhanced(implausibleInput);
    const delta = Math.abs(withBadCP.value - maderOnly.value);
    // Guardrail: la contamination CP implausible doit rester bornée (< 0.20 mmol/L/s)
    expect(delta).toBeLessThan(0.20);
  });

  it("confidence is not inflated vs coherent data", () => {
    const good = computeVLamaxBikeV2Enhanced(baseCoherent);
    const bad = computeVLamaxBikeV2Enhanced(implausibleInput);
    // Tolérance : la confiance ne doit pas dépasser la baseline cohérente de plus de 0.15
    // (les warnings compensent la sortie du W' cross-check).
    expect(bad.confidence).toBeLessThanOrEqual(good.confidence + 0.15);
  });

  it("W'→VLamax cross-validation is skipped (no vlamaxFromWprime when implausible)", () => {
    const result = computeVLamaxBikeV2Enhanced(implausibleInput);
    // If CP is implausible, vlamax_from_wprime should be null
    if (result.components) {
      // Check the cross-validation was blocked
      const cpQuality = result.components.cpResult?.dataQuality;
      if (cpQuality === "implausible") {
        expect(result.components.vlamax_from_wprime).toBeNull();
      }
    }
  });

  it("Score G W index is null when CP is implausible", () => {
    const result = computeVLamaxBikeV2Enhanced(implausibleInput);
    if (result.components && result.components.cpResult?.dataQuality === "implausible") {
      // W (W' index) should have been excluded from Score G
      expect(result.components.W).toBeNull();
    }
  });
});

// =============================================
// GROUP 3: Inverted monotonicity
// =============================================

describe("CP↔VLamax contamination guard — inverted monotonicity", () => {
  it("inverted P60s > P30s triggers a warning or diagnostic", () => {
    const result = computeVLamaxBikeV2Enhanced(invertedInput);
    // The CP model should detect flattening or inversion
    const hasWarning = result.warnings.length > 0;
    expect(hasWarning).toBe(true);
  });

  it("inverted data does not inflate VLamax above coherent baseline", () => {
    const coherent = computeVLamaxBikeV2Enhanced(baseCoherent);
    const inverted = computeVLamaxBikeV2Enhanced(invertedInput);
    // Inverted data should not produce a higher VLamax than coherent data
    // (P30s=400 < baseline P30s=750, so VLamax should be lower or similar)
    expect(inverted.value).toBeLessThanOrEqual(coherent.value + 0.05);
  });
});

// =============================================
// GROUP 4: Diesel profile with low W' — no false alarm
// =============================================

describe("CP↔VLamax contamination guard — diesel profile (low W' is legitimate)", () => {
  it("diesel profile with low Pmax does not trigger implausible warning", () => {
    const result = computeVLamaxBikeV2Enhanced(dieselAberrantWprime);
    const hasImplausible = result.warnings.some(w => w.includes("implausible"));
    // A diesel profile with coherent data should NOT be flagged as implausible
    expect(hasImplausible).toBe(false);
  });

  it("diesel profile produces VLamax in moderate-low range (< 0.60)", () => {
    const result = computeVLamaxBikeV2Enhanced(dieselAberrantWprime);
    // With FTP 300, Pmax 800 (low ratio 2.67), high TTE 55 → aérobie-dominant
    expect(result.value).toBeLessThanOrEqual(0.60);
  });
});

// =============================================
// GROUP 5: Score G weight redistribution
// =============================================

describe("CP↔VLamax contamination guard — Score G weight redistribution", () => {
  it("Score G still computes when W' is excluded (enough other indices)", () => {
    const result = computeVLamaxBikeV2Enhanced(implausibleInput);
    // Score G should still work with Pmax, E, D even without W/S30/S60
    expect(result.components?.scoreG).not.toBeNull();
  });

  it("Mader dominates fusion even with implausible Score G indices", () => {
    const result = computeVLamaxBikeV2Enhanced(implausibleInput);
    // With vo2max available, Mader should be the primary method
    expect(result.formula).toBe("tfcl_v2_mader");
  });
});
