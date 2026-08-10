import { describe, it, expect } from "vitest";
import {
  resolveCanonicalDuration,
  formatDurationForPrompt,
  isWideDurationRange,
  dominantPhase,
  PHASE_DURATION_WEIGHT,
} from "@/lib/plan/workoutDurationResolver";

describe("workoutDurationResolver", () => {
  const wide = { durationMin: [120, 230] as [number, number] };

  it("interpole selon le poids de phase et arrondit au pas de 10 (≥120')", () => {
    expect(resolveCanonicalDuration(wide, "base")).toBe(150);   // 120 + 110*0.25 = 147.5 → 150
    expect(resolveCanonicalDuration(wide, "build")).toBe(180);  // 120 + 110*0.55 = 180.5 → 180
    expect(resolveCanonicalDuration(wide, "peak")).toBe(210);   // 120 + 110*0.85 = 213.5 → 210
    expect(resolveCanonicalDuration(wide, "taper")).toBe(130);  // 120 + 110*0.10 = 131 → 130
  });

  it("arrondit au pas de 5 pour les séances courtes", () => {
    expect(resolveCanonicalDuration({ durationMin: [40, 70] }, "build")).toBe(55);
  });

  it("reste toujours dans la plage déclarée", () => {
    for (const phase of ["base", "build", "peak", "taper"] as const) {
      const d = resolveCanonicalDuration(wide, phase);
      expect(d).toBeGreaterThanOrEqual(120);
      expect(d).toBeLessThanOrEqual(230);
    }
  });

  it("privilégie durationByPhase quand il est fourni", () => {
    const w = { durationMin: [120, 230] as [number, number], durationByPhase: { peak: 225 } };
    expect(resolveCanonicalDuration(w, "peak")).toBe(225);
    expect(resolveCanonicalDuration(w, "base")).toBe(150);
  });

  it("clampe un durationByPhase hors plage", () => {
    const w = { durationMin: [60, 90] as [number, number], durationByPhase: { build: 400 } };
    expect(resolveCanonicalDuration(w, "build")).toBe(90);
  });

  it("gère les plages dégénérées et nulles", () => {
    expect(resolveCanonicalDuration({ durationMin: [60, 60] }, "peak")).toBe(60);
    expect(resolveCanonicalDuration({ durationMin: [0, 0] }, "build")).toBe(0);
  });

  it("est déterministe", () => {
    const a = resolveCanonicalDuration(wide, "build");
    const b = resolveCanonicalDuration(wide, "build");
    expect(a).toBe(b);
  });

  it("détecte les plages larges (>60 min d'amplitude)", () => {
    expect(isWideDurationRange({ durationMin: [120, 230] })).toBe(true);
    expect(isWideDurationRange({ durationMin: [60, 90] })).toBe(false);
  });

  it("n'expose qu'une durée unique au prompt pour une plage large", () => {
    expect(formatDurationForPrompt(wide, "build")).toBe("180");
    expect(formatDurationForPrompt({ durationMin: [60, 90] }, "build")).toBe("75 (60-90)");
  });

  it("choisit la phase dominante la plus spécifique", () => {
    expect(dominantPhase(["base", "build"])).toBe("build");
    expect(dominantPhase(["build", "peak"])).toBe("peak");
    expect(dominantPhase(["base", "build", "peak", "taper"])).toBe("taper");
    expect(dominantPhase([])).toBe("build");
    expect(dominantPhase(undefined)).toBe("build");
  });

  it("ordonne les poids de phase par charge croissante", () => {
    expect(PHASE_DURATION_WEIGHT.taper).toBeLessThan(PHASE_DURATION_WEIGHT.base);
    expect(PHASE_DURATION_WEIGHT.base).toBeLessThan(PHASE_DURATION_WEIGHT.build);
    expect(PHASE_DURATION_WEIGHT.build).toBeLessThan(PHASE_DURATION_WEIGHT.peak);
  });
});
