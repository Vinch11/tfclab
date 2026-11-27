/**
 * Plan Ironman d'Emanuela (27/11/2026) : sauvegarde refusée (« race_proximity_outside_race_week »)
 * par un opener natation « J-3 à J-2 » placé deux semaines avant la course. Hors semaine de course,
 * une fiche de proximité de course est remplacée et jamais choisie comme remplaçante.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const card = (id: string, objectif: string, when: string, primary: string, zones: string[]): LibraryWorkout => ({
    id, cat: "A", sport: "swim", objectif, necessite: "Recommandé", when, phase: ["taper"], avoid: "", durationMin: [30, 45],
    metricKey: "pace", sportKey: "swim", structure: [{ part: "Main", text: "800m", zones }], variants: {}, tags: [], goals: ["ironman"], physiology: { primary },
  } as unknown as LibraryWorkout);
  return { WorkoutLibrary: [
    card("SWIM_OPENER", "Ouverture natation taper", "Taper S-1 (J-3 à J-2)", "race_specific", ["Z3"]),
    card("SWIM_EASY_TAPER", "Natation souple d'affûtage", "Taper", "moderate_lt1", ["Z2"]),
  ] };
});

import { runReconciler } from "@/lib/plan/planReconciler";

describe("fiche de proximité de course hors semaine de course", () => {
  it("opener J-3 deux semaines avant la course → natation souple d'affûtage", () => {
    const chunk = { weeks: [{ weekNumber: 31, phase: "taper", theme: "Affûtage", sessions: [
      { day: "samedi", sport: "swim", title: "Opener", details: "", isKeySession: false, custom: false, catalogId: "SWIM_OPENER", durationMin: 35, zones: ["Z3"] } as PlanSession,
    ] }] } as unknown as PlanChunk;
    const rec = runReconciler([chunk], {}, 2, undefined, { objectiveKey: "IM", globalTotalWeeks: 32 });
    expect(chunk.weeks[0].sessions[0].catalogId).toBe("SWIM_EASY_TAPER");
    expect(rec.counters.race_proximity_repaired).toBe(1);
  });
});
