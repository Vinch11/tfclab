import { describe, it, expect } from "vitest";
import { resolveVlamaxForGoal } from "../vlamaxResolver";

/** V2.3.1: keep the original text-only inputs as negative controls.
 * Structured lactate-derived references are tested separately in c8StabilizationV231.
 * A historical laboratory label must not bypass the unchanged CAP estimator.
 */

describe("resolveVlamaxForGoal — qualification séparée des anciens labels labo", () => {
  it("un ancien label labo CAP sans preuve ne remplace pas une estimation admissible", () => {
    const result = resolveVlamaxForGoal(
      {
        vlamax_run: 0.70,
        vlamax_source: "test_labo",
        vlamax_protocol: "Sprint lactate labo",
        sport_main: "run",
        vma: 20,
        pace_threshold_sec_per_km: 200,
      },
      { goal: "Marathon" }
    );
    const control = resolveVlamaxForGoal({ vlamax_run: 0.70, sport_main: "run", vma: 20, pace_threshold_sec_per_km: 200 }, { goal: "Marathon" });
    expect(result.value).toBe(control.value);
    expect(result.value).not.toBe(0.70);
    expect(result.scientificQualification?.status).toBe("unknown");
    expect(result.reason).toBe("ok");
  });

  it("un label labo sans autres données conserve le brut comme repli, sans boost labo", () => {
    const result = resolveVlamaxForGoal(
      {
        vlamax_run: 0.55,
        vlamax_source: "test_labo",
        vlamax_protocol: "Prise de sang lactate",
        sport_main: "run",
      },
      { goal: "703" }
    );
    expect(result.value).toBe(0.55);
    expect(result.confidence).toBeCloseTo(0.50, 2);
    expect(result.scientificQualification?.admissibility).toBe("not_established");
  });

  it("une valeur non-labo (terrain) continue de passer par l'estimateur CAP pondéré, avec sa propre confiance calculée", () => {
    const result = resolveVlamaxForGoal(
      {
        vlamax_run: 0.45,
        sport_main: "run",
        vma: 18,
        pace_threshold_sec_per_km: 240,
        sprint_15s_distance: 80,
      },
      { goal: "Marathon" }
    );
    expect(result.reason).toBe("ok");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.95);
  });

  it("le fallback brut non-validé (estimateur insuffisant) est traité comme confiance 'estimation' (0.50), pas silencieusement fiable", () => {
    const result = resolveVlamaxForGoal(
      { vlamax_run: 0.40, sport_main: "run" }, // aucune donnée pour l'estimateur CAP
      { goal: "Marathon" }
    );
    expect(result.value).toBe(0.40);
    expect(result.confidence).toBeCloseTo(0.50, 2);
  });
});
