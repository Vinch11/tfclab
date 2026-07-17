import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "TEST_BIKE_SEUIL_Z4",
      cat: "B", sport: "bike", objectif: "test", necessite: "Recommandé", when: "",
      avoid: "", durationMin: [50, 90], metricKey: "power", sportKey: "bike",
      structure: [
        { part: "Warm-up", text: "15' Z1", zones: ["Z1"] },
        { part: "Main", text: "3x10' Z4", zones: ["Z2", "Z4"] },
        { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
      ],
      variants: {},
    },
    {
      id: "TEST_RUN_EASY_Z2",
      cat: "C", sport: "run", objectif: "test", necessite: "Recommandé", when: "",
      avoid: "", durationMin: [45, 90], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
        { part: "Main", text: "60' continu Z2", zones: ["Z1", "Z2"] },
        { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
      ],
      variants: {},
    },
    {
      id: "TEST_STR_HEAVY",
      cat: "B", sport: "strength", objectif: "test", necessite: "Recommandé", when: "",
      avoid: "", durationMin: [45, 60], metricKey: "power", sportKey: "strength",
      structure: [
        { part: "Main", text: "Squat 4x5", zones: ["Z4"] },
      ],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

// Import AFTER mock so FICHES_BY_ID captures the mocked library.
import { runReconciler } from "@/lib/plan/planReconciler";

function makeChunk(session: any): PlanChunk {
  return {
    weeks: [{
      weekNumber: 1, phase: "build", theme: "T",
      sessions: [session],
    }],
  } as unknown as PlanChunk;
}

describe("runReconciler — hydrateDilutedZones", () => {
  it("Cas 1 : dilution restaurée (fiche Z4, instance Z1/Z2) → ajoute Z4 sans supprimer", () => {
    const s: any = {
      day: "mardi", sport: "bike", title: "Seuil", details: "", isKeySession: true,
      custom: false, catalogId: "TEST_BIKE_SEUIL_Z4", durationMin: 60, zones: ["Z1", "Z2"],
    };
    const rec = runReconciler([makeChunk(s)], {}, 1);
    expect(rec.counters.zone_hydrated).toBe(1);
    expect(s.zones).toEqual(expect.arrayContaining(["Z1", "Z2", "Z4"]));
  });

  it("Cas 2 : séance saine (contient déjà Z4) → inchangée", () => {
    const s: any = {
      day: "mardi", sport: "bike", title: "Seuil", details: "", isKeySession: true,
      custom: false, catalogId: "TEST_BIKE_SEUIL_Z4", durationMin: 60, zones: ["Z2", "Z4"],
    };
    const rec = runReconciler([makeChunk(s)], {}, 1);
    expect(rec.counters.zone_hydrated ?? 0).toBe(0);
    expect(s.zones).toEqual(["Z2", "Z4"]);
  });

  it("Cas 3 : fiche facile Z1/Z2 → jamais hydratée", () => {
    const s: any = {
      day: "lundi", sport: "run", title: "EF", details: "", isKeySession: false,
      custom: false, catalogId: "TEST_RUN_EASY_Z2", durationMin: 60, zones: ["Z1"],
    };
    const rec = runReconciler([makeChunk(s)], {}, 1);
    expect(rec.counters.zone_hydrated ?? 0).toBe(0);
  });

  it("Cas 4 : non-cardio (strength) → jamais touchée", () => {
    const s: any = {
      day: "mercredi", sport: "strength", title: "Renfo", details: "", isKeySession: false,
      custom: false, catalogId: "TEST_STR_HEAVY", durationMin: 45, zones: ["Z1"],
    };
    const rec = runReconciler([makeChunk(s)], {}, 1);
    expect(rec.counters.zone_hydrated ?? 0).toBe(0);
  });

  it("Cas 5 : custom → jamais touchée", () => {
    const s: any = {
      day: "jeudi", sport: "bike", title: "Custom", details: "", isKeySession: false,
      custom: true, catalogId: null, durationMin: 60, zones: ["Z1"],
    };
    const rec = runReconciler([makeChunk(s)], {}, 1);
    expect(rec.counters.zone_hydrated ?? 0).toBe(0);
  });
});
