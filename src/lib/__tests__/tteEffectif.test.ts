import { describe, it, expect } from "vitest";
import { computeTTEEffectif } from "@/lib/tteEffectif";

// =============================================
// TTE EFFECTIF — SOURCE HIERARCHY TESTS
// Priority: OBSERVED > LOAD > FTP-based > Unknown
// =============================================

describe("computeTTEEffectif", () => {
  // A) OBSERVED — highest priority
  describe("OBSERVED mode", () => {
    it("uses observed TTE when mode is OBSERVED and value provided", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: 600,
        tte_mode: "OBSERVED",
        tte_observed_min: 52,
        objectif: "IM",
      });
      expect(result.tte_min).toBe(52);
      expect(result.source).toBe("observed");
      expect(result.confidence).toBe(0.95);
    });

    it("ignores TSS even when provided if OBSERVED is available", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: 800,
        tte_mode: "OBSERVED",
        tte_observed_min: 48,
        objectif: "IM",
      });
      expect(result.tte_min).toBe(48);
      expect(result.source).toBe("observed");
    });
  });

  // B) LOAD estimation via TSS
  describe("LOAD mode", () => {
    it("estimates TTE from TSS_7d when OBSERVED not available", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: 500,
        tte_mode: "LOAD",
        tte_observed_min: null,
        objectif: "IM",
      });
      expect(result.source).toBe("estimated");
      expect(result.confidence).toBe(0.7);
      expect(result.tte_min).toBeGreaterThan(0);
    });

    it("falls back to TSS when tte_mode is not OBSERVED", () => {
      const result = computeTTEEffectif({
        ftp: 250,
        tss_7d: 400,
        objectif: "Marathon",
      });
      expect(result.source).toBe("estimated");
      expect(result.tte_min).toBeGreaterThan(0);
    });
  });

  // C) FTP-based fallback
  describe("FTP-based fallback", () => {
    it("estimates TTE from FTP when no TSS available", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: null,
        objectif: "IM",
      });
      expect(result.source).toBe("estimated");
      expect(result.confidence).toBe(0.5);
      expect(result.tte_min).toBeGreaterThanOrEqual(35);
      expect(result.tte_min).toBeLessThanOrEqual(60);
    });

    it("higher FTP suggests higher TTE estimation", () => {
      const low = computeTTEEffectif({ ftp: 200, tss_7d: null, objectif: "IM" });
      const high = computeTTEEffectif({ ftp: 350, tss_7d: null, objectif: "IM" });
      expect(high.tte_min).toBeGreaterThanOrEqual(low.tte_min);
    });
  });

  // D) Unknown — no data (F38: plus de fake default 45)
  describe("Unknown mode", () => {
    it("returns tte_min=0 with low confidence when no data (F38)", () => {
      const result = computeTTEEffectif({
        objectif: "IM",
      });
      expect(result.tte_min).toBe(0);
      expect(result.source).toBe("unknown");
      expect(result.confidence).toBeLessThanOrEqual(0.25);
    });

    it("returns unknown when all inputs are null", () => {
      const result = computeTTEEffectif({
        ftp: null,
        tss_7d: null,
        tte_mode: null,
        tte_observed_min: null,
        objectif: "IM",
      });
      expect(result.source).toBe("unknown");
      expect(result.tte_min).toBe(0);
    });
  });

  // Target computation
  describe("Target values", () => {
    it("includes target for IM objectif", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: 500,
        objectif: "IM",
      });
      expect(result.target).toBeDefined();
      expect(result.target).toBeGreaterThan(0);
    });

    it("includes status for scored results", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7d: 500,
        tte_mode: "OBSERVED",
        tte_observed_min: 55,
        objectif: "IM",
      });
      expect(result.status).toBeDefined();
      expect(["ok", "warning", "critical"]).toContain(result.status);
    });
  });

  // Legacy compat
  describe("Legacy mapping", () => {
    it("accepts tss_7j as legacy alias for tss_7d", () => {
      const result = computeTTEEffectif({
        ftp: 280,
        tss_7j: 500,
        objectif: "IM",
      });
      expect(result.source).toBe("estimated");
      expect(result.tte_min).toBeGreaterThan(0);
    });
  });
});
