import { describe, it, expect } from "vitest";
import { resolveCurrentPlanBlock } from "../getCurrentPlanBlock";

/**
 * Remplace le stub DashboardPage qui retournait toujours "build" — vérifie
 * que le bloc réel (theme écrit par l'IA, ex. "Chantier VLamax ↓") est
 * résolu depuis la vraie semaine en cours du plan, pas une valeur figée.
 */

function makePlan(weeks: Array<{ weekNumber: number; theme?: string; phase?: string }>, extra: Record<string, unknown> = {}) {
  return { weeks, ...extra };
}

describe("resolveCurrentPlanBlock", () => {
  it("résout la bonne semaine depuis _planStartDate explicite", () => {
    const plan = makePlan(
      [
        { weekNumber: 1, theme: "Fondation", phase: "base" },
        { weekNumber: 2, theme: "Chantier VLamax ↓", phase: "build" },
        { weekNumber: 3, theme: "Consolidation TTE", phase: "build" },
      ],
      { _planStartDate: "2026-08-03" }, // lundi
    );
    // now = 10 jours après le lundi de départ → semaine 2
    const result = resolveCurrentPlanBlock(plan, new Date("2026-08-13"));
    expect(result?.weekNumber).toBe(2);
    expect(result?.theme).toBe("Chantier VLamax ↓");
    expect(result?.phase).toBe("build");
  });

  it("plafonne à la semaine 1 si la date de référence est avant le début du plan", () => {
    const plan = makePlan([{ weekNumber: 1, theme: "Fondation" }], { _planStartDate: "2026-09-01" });
    const result = resolveCurrentPlanBlock(plan, new Date("2026-08-01"));
    expect(result?.weekNumber).toBe(1);
  });

  it("retourne null si la date de référence dépasse la fin du plan (plan terminé)", () => {
    const plan = makePlan(
      [{ weekNumber: 1, theme: "Fondation" }, { weekNumber: 2, theme: "Chantier" }],
      { _planStartDate: "2026-01-05" },
    );
    const result = resolveCurrentPlanBlock(plan, new Date("2026-08-01"));
    expect(result).toBeNull();
  });

  it("retourne null si aucune date de départ n'est inférable (ni _planStartDate ni _raceDate)", () => {
    const plan = makePlan([{ weekNumber: 1, theme: "Fondation" }]);
    expect(resolveCurrentPlanBlock(plan, new Date())).toBeNull();
  });

  it("infère la date de départ depuis _raceDate pour un plan ancien (legacy)", () => {
    // Course le 2026-10-04 (dimanche), plan de 4 semaines → S1 commence le lundi 4 sem avant.
    const plan = makePlan(
      [
        { weekNumber: 1, theme: "Fondation" },
        { weekNumber: 2, theme: "Chantier VO2max" },
        { weekNumber: 3, theme: "Race-Specific" },
        { weekNumber: 4, theme: "Affûtage" },
      ],
      { _raceDate: "2026-10-04" },
    );
    // now = milieu de la semaine 2
    const result = resolveCurrentPlanBlock(plan, new Date("2026-09-16"));
    expect(result?.theme).toBe("Chantier VO2max");
  });

  it("retourne null si le plan n'a aucune semaine", () => {
    expect(resolveCurrentPlanBlock(makePlan([]), new Date())).toBeNull();
    expect(resolveCurrentPlanBlock(null, new Date())).toBeNull();
  });

  it("retourne phase=null si le champ est absent de la semaine (pas de valeur inventée)", () => {
    const plan = makePlan([{ weekNumber: 1, theme: "Fondation" }], { _planStartDate: "2026-08-03" });
    const result = resolveCurrentPlanBlock(plan, new Date("2026-08-04"));
    expect(result?.theme).toBe("Fondation");
    expect(result?.phase).toBeNull();
  });
});
