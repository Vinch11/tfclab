import { describe, it, expect } from "vitest";
import { TRAIL_DETAILS_CRITICAL_RX } from "@/lib/plan/planSchema";

describe("TRAIL_DETAILS_CRITICAL_RX — 'massif' contextuel", () => {
  it("ne matche PAS 'massif' en usage adjectival (volume/travail/repas)", () => {
    // Non-régression : "CSS Blocs Longs" ne doit plus être substituée pour "volume massif".
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Volume seuil massif sans casse")).toBe(false);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Travail massif à intensité modérée")).toBe(false);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Repas glucidique massif la veille")).toBe(false);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Apport sodium massif recommandé")).toBe(false);
  });

  it("matche 'massif' en contexte géographique", () => {
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Sortie en massif ce week-end")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Massif des Vosges")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("massif du Vercors")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("Massif Central")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("séance en moyenne montagne")).toBe(true);
  });

  it("garde les autres marqueurs critical", () => {
    expect(TRAIL_DETAILS_CRITICAL_RX.test("+600m dénivelé")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("D+ 800m sur la sortie")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("montée sèche 15min")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("power-hike avec bâtons")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("sentier technique")).toBe(true);
    expect(TRAIL_DETAILS_CRITICAL_RX.test("sortie dans les Alpes")).toBe(true);
  });
});
