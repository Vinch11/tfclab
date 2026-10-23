import { describe, expect, it } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import { evaluateRepairSportingEquivalence } from "../../../../supabase/functions/_shared/repairSportingEquivalence";

function workout(id: string, primary: "vo2max" | "mlss"): LibraryWorkout {
  return {
    id,
    cat: "B",
    sport: "course",
    objectif: id,
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "",
    durationMin: [50, 60],
    metricKey: "allure",
    sportKey: "course",
    structure: [{ part: "Main", text: "Même zone descriptive Z5", zones: ["Z5"] }],
    variants: {},
    goals: ["10k"],
    physiology: { primary, rationale: "Fixture structurée" },
  };
}

describe("remplacement — intention physiologique structurée", () => {
  it("refuse un seuil qui conserve la même zone mais change l'objectif VO₂", () => {
    const original = buildRepairWorkoutMetadata(workout("ORIGINAL_VO2", "vo2max"));
    const candidate = buildRepairWorkoutMetadata(workout("CANDIDATE_THRESHOLD", "mlss"));
    const result = evaluateRepairSportingEquivalence(original, candidate, { phase: "build", objective: "10K" });
    expect(original.intentFamily).toBe("vo2");
    expect(candidate.intentFamily).toBe("seuil");
    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain("intent:vo2->seuil");
  });
});
