import { describe, expect, it } from "vitest";
import { validateSessionCataloguePlan } from "../sessionCatalogueValidation";

// Plan Marathon → Ironman : une fiche marathon d'une semaine du cycle Marathon
// ne doit pas être jugée contre l'objectif final Ironman.
const plan = (cycleObjective?: string) => ({
  weeks: [{ weekNumber: 1, phase: "base", cycleObjective, sessions: [{ sport: "course", title: "[C_MAR_HILL_STRENGTH] Côtes", details: "", durationMin: 60 } as any] }],
});

describe("validateSessionCataloguePlan — objectif du cycle", () => {
  it("juge une semaine du cycle Marathon contre le Marathon", () => {
    const codes = validateSessionCataloguePlan(plan("Marathon"), "Ironman").map(i => i.message);
    expect(codes.some(m => m.includes("objective:ironman"))).toBe(false);
  });
  it("garde l'objectif final quand la semaine n'a pas de cycle", () => {
    const codes = validateSessionCataloguePlan(plan(), "Ironman").map(i => i.message);
    expect(codes.some(m => m.includes("objective:ironman"))).toBe(true);
  });
});
