import { describe, it, expect } from "vitest";
import {
  detectUnifiedLimiter,
  UnifiedLimiterInput,
  getVo2maxAgeFactor,
  getVo2maxTarget,
} from "../unifiedLimiterDetection";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const FULL_PROFILE_IM: UnifiedLimiterInput = {
  vo2max: 58,
  ftpKg: 4.2,
  vlamax: 0.35,
  wprimeKj: 18,
  cpDataQuality: "good",
  tte: 52,
  fatmax: 62,
  economyScore: 70,
  availabilityScore: 80,
  hasHealthAlerts: false,
  objectif: "IM",
  ambition: "competitor",
  age: 35,
};

const EMPTY_PROFILE: UnifiedLimiterInput = {
  vo2max: null,
  ftpKg: null,
  vlamax: null,
  wprimeKj: null,
  cpDataQuality: null,
  tte: null,
  fatmax: null,
  economyScore: null,
  availabilityScore: null,
  hasHealthAlerts: false,
  objectif: "IM",
  ambition: "age_group",
  age: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("detectUnifiedLimiter", () => {
  // ── Profil complet ──────────────────────────────────────────────────────────
  it("returns a valid result for a complete profile", () => {
    const result = detectUnifiedLimiter(FULL_PROFILE_IM);
    expect(result.primaryLimiter).toBeDefined();
    expect(result.gapAnalysis.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.insufficientData).toBe(false);
  });

  it("identifies a limiter when a metric is clearly below target", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      ftpKg: 2.5, // very low for competitor IM
    };
    const result = detectUnifiedLimiter(input);
    expect(result.primaryLimiter).not.toBe("none");
    const ftpGap = result.gapAnalysis.find((g) => g.metric === "FTP/kg");
    expect(ftpGap?.status).toBe("limiting");
  });

  // ── Données insuffisantes ──────────────────────────────────────────────────
  it("flags insufficientData when 2+ critical metrics are null", () => {
    const input: UnifiedLimiterInput = {
      ...EMPTY_PROFILE,
      vo2max: 55, // only 1 metric provided
    };
    const result = detectUnifiedLimiter(input);
    expect(result.insufficientData).toBe(true);
    expect(result.confidence).toBe(0);
    expect(result.missingMetrics.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT flag insufficientData when all critical metrics are present", () => {
    const result = detectUnifiedLimiter(FULL_PROFILE_IM);
    expect(result.insufficientData).toBe(false);
    expect(result.missingMetrics.length).toBe(0);
  });

  it("marks null metrics as 'unknown' status in gapAnalysis", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      vlamax: null,
    };
    const result = detectUnifiedLimiter(input);
    const vlamaxGap = result.gapAnalysis.find((g) => g.metric === "VLamax");
    expect(vlamaxGap?.status).toBe("unknown");
  });

  // ── Profil équilibré vs faux équilibré ─────────────────────────────────────
  it("never returns 'Profil équilibré' when data is insufficient", () => {
    const result = detectUnifiedLimiter(EMPTY_PROFILE);
    // With all nulls, should be insufficient, not "none"
    expect(result.insufficientData).toBe(true);
    if (result.insufficientData) {
      // The label should NOT be "Profil équilibré"
      expect(result.limiterLabel).not.toBe("Profil équilibré");
    }
  });

  // ── W' guard (CP data quality) ────────────────────────────────────────────
  it("excludes W' from ranking when cpDataQuality is implausible", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      wprimeKj: 2, // very low, would normally be a limiter
      cpDataQuality: "implausible",
    };
    const result = detectUnifiedLimiter(input);
    const wGap = result.gapAnalysis.find((g) => g.metric === "W' (kJ)");
    // W' should be neutralized (value null or weightedImpact 0)
    expect(wGap?.value).toBeNull();
    expect(wGap?.weightedImpact).toBe(0);
  });

  it("excludes W' when suspect + low value", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      wprimeKj: 4,
      cpDataQuality: "suspect",
    };
    const result = detectUnifiedLimiter(input);
    const wGap = result.gapAnalysis.find((g) => g.metric === "W' (kJ)");
    expect(wGap?.value).toBeNull();
  });

  it("keeps W' when cpDataQuality is good", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      wprimeKj: 18,
      cpDataQuality: "good",
    };
    const result = detectUnifiedLimiter(input);
    const wGap = result.gapAnalysis.find((g) => g.metric === "W' (kJ)");
    expect(wGap?.value).toBe(18);
  });

  // ── VLamax trop haute pour endurance ───────────────────────────────────────
  it("detects glycolytic limiter when VLamax is way above target for IM", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      vlamax: 0.75, // very high for IM competitor
    };
    const result = detectUnifiedLimiter(input);
    const vlamaxGap = result.gapAnalysis.find((g) => g.metric === "VLamax");
    expect(vlamaxGap?.status).toBe("limiting");
    expect(vlamaxGap?.weightedImpact).toBeGreaterThan(0);
  });

  // ── Fatigue warning ────────────────────────────────────────────────────────
  it("emits fatigue warning but NOT as primaryLimiter", () => {
    const input: UnifiedLimiterInput = {
      ...FULL_PROFILE_IM,
      availabilityScore: 20,
      hasHealthAlerts: true,
    };
    const result = detectUnifiedLimiter(input);
    expect(result.fatigueWarning.active).toBe(true);
    // availability should never be the primaryLimiter
    expect(result.primaryLimiter).not.toBe("availability");
  });

  // ── Robustesse ─────────────────────────────────────────────────────────────
  it("returns robustnessScore between 0 and 100", () => {
    const result = detectUnifiedLimiter(FULL_PROFILE_IM);
    expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
    expect(result.robustnessScore).toBeLessThanOrEqual(100);
  });

  // ── Objectifs variés ───────────────────────────────────────────────────────
  it.each(["IM", "703", "Marathon", "Semi", "5K", "10K", "Trail"])(
    "does not crash for objective %s",
    (obj) => {
      const input: UnifiedLimiterInput = {
        ...FULL_PROFILE_IM,
        objectif: obj,
      };
      const result = detectUnifiedLimiter(input);
      expect(result.primaryLimiter).toBeDefined();
      expect(result.version).toBeDefined();
    }
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// VO2max age adjustment
// ═══════════════════════════════════════════════════════════════════════════════

describe("getVo2maxAgeFactor", () => {
  it("returns 1.0 for age < 30 or null", () => {
    expect(getVo2maxAgeFactor(null)).toBe(1.0);
    expect(getVo2maxAgeFactor(25)).toBe(1.0);
  });

  it("decreases with age", () => {
    expect(getVo2maxAgeFactor(35)).toBe(0.95);
    expect(getVo2maxAgeFactor(45)).toBe(0.88);
    expect(getVo2maxAgeFactor(55)).toBe(0.80);
    expect(getVo2maxAgeFactor(65)).toBe(0.72);
  });
});

describe("getVo2maxTarget", () => {
  it("adjusts target down for older athletes", () => {
    const young = getVo2maxTarget("Marathon", "elite", 25);
    const old = getVo2maxTarget("Marathon", "elite", 50);
    expect(old).toBeLessThan(young);
  });
});
