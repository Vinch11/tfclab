// @ts-nocheck
import { describe, it, expect } from "vitest";
import { EnrichedWorkoutsRunHills } from "@/lib/enrichedWorkoutsRunHills";
import {
  isTrailWorkout,
  isTrailCatalogId,
  TRAIL_DETAILS_CRITICAL_RX,
} from "@/lib/plan/trailMarkers";

describe("EnrichedWorkoutsRunHills — taxonomie route stricte (anti-fuite B3)", () => {
  it("catalogue non vide", () => {
    expect(EnrichedWorkoutsRunHills.length).toBeGreaterThan(0);
  });

  for (const w of EnrichedWorkoutsRunHills) {
    describe(w.id, () => {
      it("ID ne matche AUCUN pattern trail", () => {
        expect(isTrailCatalogId(w.id)).toBe(false);
      });
      it("préfixe *_RUN_HILL_*", () => {
        expect(/^[A-D]_RUN_HILL_/.test(w.id)).toBe(true);
      });
      it("sport=course, aucun tag trail", () => {
        expect(w.sport).toBe("course");
        expect(isTrailWorkout(w as any)).toBe(false);
        expect((w.tags ?? []).map(String).map((t) => t.toLowerCase())).not.toContain("trail");
      });
      it("goals road only (pas de goal trail)", () => {
        const goals = w.goals ?? [];
        expect(goals.length).toBeGreaterThan(0);
        for (const g of goals) {
          expect(String(g).toLowerCase()).not.toMatch(/trail/);
        }
      });
      it("aucun marqueur trail critique dans les détails de structure", () => {
        for (const part of w.structure ?? []) {
          expect(TRAIL_DETAILS_CRITICAL_RX.test(part.text)).toBe(false);
        }
      });
    });
  }
});
