import { describe, it, expect } from "vitest";
import { getCatalogExclusions } from "../useAITrainingPlan";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela, S34 — Bloc 7
 * Spécifique Ironman) : `B_703_BRICK_RACE_PACE` (goals:["half"], signature
 * 70.3 EXCLUSIVE — 3-4h, allure/puissance calibrées 70.3, jamais Ironman)
 * apparaissait dans un plan Ironman NON-LCW.
 *
 * Cause : le "goal match" (workoutCatalogBuilder.ts, scoreWorkout) ne
 * pénalise pas un goal non-matché ("no penalty for unmatched to maximize
 * diversity") — cette fiche restait donc un candidat valide (juste moins
 * bien scoré) pour le backfill structurel "≥1 séance brick" (isTriGoal), et
 * pouvait remonter une fois les vraies fiches brick Ironman (BR_IM_V*_PRO)
 * déjà consommées dans les chunks précédents. `getCatalogExclusions` bannit
 * déjà le sens inverse (fiches IM dans un plan half, `isHalf && !isLCW`) et
 * les fiches 70.3 dans un plan LCW — mais aucune règle ne bannissait les
 * fiches 70.3 EXCLUSIVES d'un plan Ironman standard (non-LCW).
 */
describe("getCatalogExclusions — B_703_BRICK_RACE_PACE banni d'un plan Ironman standard (non-half, non-LCW)", () => {
  it("bannit B_703_BRICK_RACE_PACE pour un objectif Ironman sans format LCW", () => {
    const { excludeIdPatterns } = getCatalogExclusions("Ironman", []);
    const banned = excludeIdPatterns.some((rx) => rx.test("B_703_BRICK_RACE_PACE"));
    expect(banned, "B_703_BRICK_RACE_PACE (signature 70.3 exclusive) ne doit jamais apparaître dans un plan Ironman standard").toBe(true);
  });

  it("catalogObjective='Ironman' (cycle intermédiaire d'un plan multi-objectifs) bannit aussi B_703_BRICK_RACE_PACE", () => {
    const { excludeIdPatterns } = getCatalogExclusions("Ironman", [
      { objective: "Marathon", priority: "A" } as any,
      { objective: "Ironman", priority: "A" } as any,
    ]);
    const banned = excludeIdPatterns.some((rx) => rx.test("B_703_BRICK_RACE_PACE"));
    expect(banned).toBe(true);
  });

  it("NE bannit PAS B_703_BRICK_RACE_PACE pour un objectif 70.3 (Half) — c'est sa fiche signature", () => {
    const { excludeIdPatterns } = getCatalogExclusions("Ironman 70.3", []);
    const banned = excludeIdPatterns.some((rx) => rx.test("B_703_BRICK_RACE_PACE"));
    expect(banned).toBe(false);
  });

  it("comportement LCW inchangé : B_703_BRICK_RACE_PACE déjà banni via la règle isLCW existante", () => {
    const { excludeIdPatterns } = getCatalogExclusions("Ironman 70.3", [
      { objective: "Ironman 70.3", priority: "A", raceFormat: "lcw_3day" } as any,
    ]);
    const banned = excludeIdPatterns.some((rx) => rx.test("B_703_BRICK_RACE_PACE"));
    expect(banned).toBe(true);
  });
});
