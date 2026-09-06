import { describe, it, expect } from "vitest";
import { resolveVlamaxForGoal } from "../vlamaxResolver";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) : une
 * mesure labo VLamax CAP passait par estimateVLamaxCap comme une simple
 * entrée pondérée à 0.70 parmi d'autres (ratio pace/VMA à 0.15), diluant
 * une valeur mesurée verrouillée de ~10% — alors que vlamaxEffectif.ts
 * (dashboard, PDF, plan) verrouille la même mesure telle quelle pour le
 * même athlète. Trace concrète de l'audit : vlamax_run mesuré = 0.70,
 * vma = 20 km/h, pace_threshold_sec_per_km = 200 → l'ancien resolver
 * renvoyait 0.63 (dilué), le nouveau renvoie 0.70 (verrouillé).
 */

describe("resolveVlamaxForGoal — verrouille une mesure labo au lieu de la diluer", () => {
  it("une mesure labo CAP reste exacte (verrouillée), pas diluée par le blend pace/VMA", () => {
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
    expect(result.value).toBe(0.70);
    expect(result.reason).toBe("ok");
  });

  it("la confiance d'une mesure labo verrouillée est élevée (0.92), pas hardcodée à 0.7 en aval", () => {
    const result = resolveVlamaxForGoal(
      {
        vlamax_run: 0.55,
        vlamax_source: "test_labo",
        vlamax_protocol: "Prise de sang lactate",
        sport_main: "run",
      },
      { goal: "703" }
    );
    expect(result.confidence).toBeCloseTo(0.92, 2);
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
