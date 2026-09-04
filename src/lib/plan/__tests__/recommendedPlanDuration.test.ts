import { describe, it, expect } from "vitest";
import { evaluateDurationCoherence } from "../recommendedPlanDuration";

describe("evaluateDurationCoherence", () => {
  it("Ironman en 4 semaines → too_short (sous le plancher)", () => {
    const r = evaluateDurationCoherence(4, "Ironman", "age_group");
    expect(r.coherence).toBe("too_short");
    expect(r.message).toMatch(/court/);
  });

  it("Ironman Elite en 16 semaines → short_for_ambition (au-dessus du plancher mais sous la fenêtre idéale pour ambition élevée)", () => {
    const r = evaluateDurationCoherence(16, "Ironman", "elite");
    expect(r.coherence).toBe("short_for_ambition");
  });

  it("Ironman Age Group en 16 semaines → ok (fenêtre idéale sans exigence d'ambition élevée)", () => {
    const r = evaluateDurationCoherence(16, "Ironman", "age_group");
    expect(r.coherence).toBe("ok");
  });

  it("5K Finisher en 30 semaines → long", () => {
    const r = evaluateDurationCoherence(30, "5K", "finisher");
    expect(r.coherence).toBe("long");
  });

  it("70.3 en 14 semaines, ambition competitor → ok", () => {
    const r = evaluateDurationCoherence(14, "Ironman 70.3", "competitor");
    expect(r.coherence).toBe("ok");
  });

  it("Objectif inconnu → toujours ok, range null (pas de faux avertissement)", () => {
    const r = evaluateDurationCoherence(2, "Objectif Inconnu XYZ", "elite");
    expect(r.coherence).toBe("ok");
    expect(r.range).toBeNull();
  });

  it("Durée invalide (0 ou NaN) → ok, range null", () => {
    expect(evaluateDurationCoherence(0, "Marathon", "elite").coherence).toBe("ok");
    expect(evaluateDurationCoherence(NaN, "Marathon", "elite").coherence).toBe("ok");
  });
});
