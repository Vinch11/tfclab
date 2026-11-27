/**
 * Plan Ironman d'Emanuela (27/11/2026) : sauvegarde bloquée (« phase:taper ») par une sortie longue
 * d'affûtage portant une fiche de développement, sans fiche de même intention éligible en affûtage.
 * En affûtage, le réconciliateur se rabat sur une fiche facile / allure course éligible du même sport.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const card = (id: string, sport: string, objectif: string, phase: string[], durationMin: [number, number], zones: string[], primary: string): LibraryWorkout => ({
    id, cat: "A", sport, objectif, necessite: "Recommandé", when: phase.join(", "), phase, avoid: "", durationMin,
    metricKey: sport === "bike" ? "power" : "pace", sportKey: sport, structure: [{ part: "Main", text: `${durationMin[0]}min ${zones.join("-")}`, zones }],
    variants: {}, tags: [], goals: ["ironman"], physiology: { primary },
  } as unknown as LibraryWorkout);
  return { WorkoutLibrary: [
    card("BIKE_TT_RACE_PACE", "bike", "Contre-la-montre allure course", ["build", "peak"], [90, 140], ["Z4"], "race_specific"),
    card("BIKE_TAPER_ENDURANCE", "bike", "Endurance d'affûtage", ["taper"], [120, 150], ["Z2"], "moderate_lt1"),
  ] };
});

import { runReconciler } from "@/lib/plan/planReconciler";

describe("affûtage : fiche hors phase remplacée par une fiche d'affûtage", () => {
  it("sortie longue de développement en affûtage → endurance d'affûtage du même sport", () => {
    const chunk = { weeks: [{ weekNumber: 30, phase: "taper", theme: "Affûtage", sessions: [
      { day: "samedi", sport: "bike", title: "Sortie affûtage", details: "", isKeySession: false, custom: false, catalogId: "BIKE_TT_RACE_PACE", durationMin: 135, zones: ["Z4"] } as PlanSession,
    ] }] } as unknown as PlanChunk;
    runReconciler([chunk], { 30: { phase: "taper", weekType: "taper" } as never }, 2, undefined, { objectiveKey: "IM", globalTotalWeeks: 32 });
    expect(chunk.weeks[0].sessions[0].catalogId).toBe("BIKE_TAPER_ENDURANCE");
    expect(chunk.weeks[0].sessions[0].durationMin).toBe(135);
  });
});
