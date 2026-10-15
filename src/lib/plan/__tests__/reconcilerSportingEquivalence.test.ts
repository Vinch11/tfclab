import { describe, expect, it, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";

const { workout } = vi.hoisted(() => ({ workout: (
  id: string,
  intent: "easy" | "threshold" | "test" | "race",
  phase: Array<"base" | "build" | "peak" | "taper">,
  durationMin: [number, number],
  goals: any[] = ["5k"],
  avoid = "",
): LibraryWorkout => ({
  id,
  cat: intent === "test" ? "C" : intent === "race" ? "B" : "A",
  sport: "run",
  objectif: id,
  necessite: "Recommandé",
  when: phase.join("/"),
  phase,
  avoid,
  durationMin,
  metricKey: "pace",
  sportKey: "run",
  structure: [{
    part: "Main",
    text: intent === "easy" ? "Endurance fondamentale continue" : intent === "test" ? "Test lactate" : intent === "race" ? "Allure spécifique course" : "6 x 1000 m au seuil",
    zones: intent === "easy" ? ["Z2"] : intent === "threshold" || intent === "test" || intent === "race" ? ["Z4"] : ["Z2"],
  }],
  variants: {},
  tags: intent === "test" ? ["test", "lactate"] : intent === "race" ? ["race-pace"] : intent === "easy" ? ["endurance"] : ["threshold"],
  goals,
}) }));

vi.mock("@/lib/workoutLibrary", () => ({
  WorkoutLibrary: [
    workout("A_RUN_Z2_EASY", "easy", ["base", "build"], [35, 50]),
    workout("ENR_RUN_DESCENDING_REST", "threshold", ["base", "build"], [55, 70]),
    workout("BUILD_EASY_ORIGINAL", "easy", ["peak"], [55, 70]),
    workout("NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL", "test", ["build"], [55, 75], ["10k", "semi", "marathon"], "Sans lactatémètre"),
    workout("SEILER_RUN_Z1_EASY_LONG", "easy", ["base", "build"], [45, 60]),
    workout("A_IM_RUN_PACE", "race", ["build", "peak"], [60, 120], ["ironman"]),
    workout("INITIAL_EASY", "easy", ["peak"], [40, 50]),
    workout("B_703_RUN_THRESHOLD", "threshold", ["build"], [45, 65], ["half"]),
    workout("CANOVA_RUN_PROGRESSIVE_LONG", "easy", ["build", "peak"], [80, 95]),
    workout("B_SEMI_RACE_PACE", "race", ["peak"], [50, 70], ["semi"]),
    workout("A_RUN_LONG_PROG_PRO", "easy", ["build"], [40, 50]),
    workout("A_RUN_FARTLEK_LIBRE", "threshold", ["build"], [50, 65]),
    workout("D_TAPER_RUN_OPENER", "race", ["taper"], [25, 40]),
  ],
}));

import { runReconciler } from "@/lib/plan/planReconciler";

function session(id: string, durationMin: number, day = "mardi"): PlanSession {
  return { day, sport: "run", title: id, details: `[ID: ${id}]`, isKeySession: true, custom: false, catalogId: id, durationMin, zones: ["Z2"] } as PlanSession;
}

function quota(weekType: "load" | "recovery"): WeekQuotaEntry {
  return {
    quota: {
      swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 0, max: 6 }, brick: { min: 0, max: 0 }, strength: { min: 0, max: 0 },
      totalSessions: { min: 0, max: 6 }, maxSessionsPerDay: 2, minFullRestDays: 1,
      source: { tier: "practitioner_literature", ref: "test" },
    },
    floors: { minSwimPerWeek: 0, minStrengthPerWeek: 0, longRideWeekly: false, longRunWeekly: false },
    weekType,
    downgraded: false,
  } as WeekQuotaEntry;
}

function reconcile(originalId: string, badId: string, durationMin: number, phase: "base" | "build" | "peak" | "taper", weekType: "load" | "recovery" = "load") {
  const s = session(originalId, durationMin);
  const chunk = { weeks: [{ weekNumber: 4, phase, theme: weekType === "recovery" ? "Décharge" : "Charge", sessions: [s] }] } as unknown as PlanChunk;
  const result = runReconciler([chunk], { 4: quota(weekType) }, 2, new Set([originalId, badId]), {
    objectiveKey: "5K",
    globalTotalWeeks: 12,
    globalWeekOffset: 3,
  });
  return { s, result };
}

describe("réparations client — équivalence sportive complète", () => {
  it.each([
    ["sortie longue facile → 6 × 1 000 m Z4", "A_RUN_Z2_EASY", "ENR_RUN_DESCENDING_REST", 60, "build", "load"],
    ["séance build → protocole lactate norvégien", "BUILD_EASY_ORIGINAL", "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL", 60, "build", "load"],
    ["endurance facile → allure Ironman post-vélo", "SEILER_RUN_Z1_EASY_LONG", "A_IM_RUN_PACE", 75, "build", "load"],
    ["séance initiale → seuil 70.3", "INITIAL_EASY", "B_703_RUN_THRESHOLD", 55, "build", "load"],
    ["progression longue → allure semi-marathon", "CANOVA_RUN_PROGRESSIVE_LONG", "B_SEMI_RACE_PACE", 60, "peak", "load"],
    ["recovery → fartlek/côtes/4 × 1 000 m", "A_RUN_LONG_PROG_PRO", "A_RUN_FARTLEK_LIBRE", 60, "build", "recovery"],
  ] as const)("laisse non résolu : %s", (_label, original, bad, duration, phase, weekType) => {
    const { s, result } = reconcile(original, bad, duration, phase, weekType);
    expect(s.catalogId).toBe(original);
    expect(result.logs.some(line => /unresolved|reconcile_conflict|no_safe_neighbor/.test(line))).toBe(true);
  });

  it("S11 : deux ouvertures identiques restent explicitement non résolues si aucune autre ouverture équivalente n'existe", () => {
    const first = session("D_TAPER_RUN_OPENER", 30, "mardi");
    const duplicate = session("D_TAPER_RUN_OPENER", 30, "jeudi");
    const chunk = { weeks: [{ weekNumber: 11, phase: "taper", theme: "Affûtage", sessions: [first, duplicate] }] } as unknown as PlanChunk;
    const result = runReconciler([chunk], { 11: quota("load") }, 2, new Set(["D_TAPER_RUN_OPENER"]), {
      objectiveKey: "5K", globalTotalWeeks: 12, globalWeekOffset: 0,
    });
    expect(duplicate.catalogId).toBe("D_TAPER_RUN_OPENER");
    expect(result.counters.week_duplicate_unresolved).toBe(1);
    expect(result.logs.some(line => line.includes("week_duplicate_unresolved"))).toBe(true);
  });

  it("enchaînement serveur → client : une SL laissée intacte par le serveur ne devient pas incompatible au second étage", () => {
    // Forme exacte remise par applySLFloorEnforcement quand son remplacement
    // structuré est non résolu (couvert par le test Deno homologue).
    const serverOutput = {
      weeks: [{
        weekNumber: 4,
        phase: "build",
        theme: "Charge",
        sessions: [session("A_RUN_Z2_EASY", 60, "dimanche")],
      }],
    } as unknown as PlanChunk;
    const result = runReconciler(
      [serverOutput],
      { 4: quota("load") },
      2,
      new Set(["A_RUN_Z2_EASY", "ENR_RUN_DESCENDING_REST"]),
      { objectiveKey: "5K", globalTotalWeeks: 12, globalWeekOffset: 3 },
    );
    expect(serverOutput.weeks[0].sessions[0].catalogId).toBe("A_RUN_Z2_EASY");
    expect(result.counters.duration_unresolved).toBe(1);
    expect(result.logs.some(line => line.includes("reconcile_conflict"))).toBe(true);
  });
});

