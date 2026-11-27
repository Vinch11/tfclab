/**
 * Décision coach (27/11/2026, plan Ironman d'Emanuela) : en phase spécifique Ironman / 70.3,
 * l'intensité sert l'allure de course — au plus une séance au seuil ou VO2max par semaine.
 * L'excédent est remplacé (même sport, même durée) par une séance allure course ou endurance,
 * et le texte de la séance le signale. La règle « plus de 3 séances exigeantes » des confirmés
 * reste inchangée ailleurs.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const card = (id: string, sport: string, objectif: string, text: string, zones: string[], tags: string[], primary: string): LibraryWorkout => ({
    id, cat: "A", sport, objectif, necessite: "Recommandé", when: "Spécifique", phase: ["build", "peak"],
    avoid: "", durationMin: [50, 100], metricKey: sport === "bike" ? "power" : "pace", sportKey: sport,
    structure: [{ part: "Main", text, zones }], variants: {}, tags, goals: ["im", "703"], physiology: { primary },
  } as unknown as LibraryWorkout);
  return { WorkoutLibrary: [
    card("BIKE_VO2", "bike", "VO2 4x4", "4x4min Z6 108-112% FTP", ["Z6"], ["vo2"], "vo2max"),
    card("BIKE_SEUIL", "bike", "Seuil 2x20", "2x20min Z5 95-100% FTP", ["Z5"], ["seuil"], "mlss"),
    card("RUN_VMA", "run", "VMA 4x6", "4x6min Z5 90-95% VMA", ["Z5"], ["vma"], "vo2max"),
    card("BIKE_RACE_IM", "bike", "Allure Ironman", "3x30min allure IM Z3", ["Z3"], ["race_pace", "allure ironman"], "race_specific"),
    card("BIKE_EF", "bike", "Endurance fondamentale vélo", "80min Z2 continu", ["Z2"], ["endurance"], "moderate_lt1"),
    card("RUN_EF", "run", "Endurance fondamentale", "70min Z2 continu", ["Z2"], ["endurance"], "moderate_lt1"),
  ] };
});

import { runReconciler, SPECIFIC_PHASE_NOTE } from "@/lib/plan/planReconciler";

const s = (day: string, sport: string, id: string, zones: string[], min = 75): PlanSession =>
  ({ day, sport, title: id, details: "", isKeySession: false, custom: false, catalogId: id, durationMin: min, zones } as PlanSession);
const week = (n: number, phase: string, sessions: PlanSession[]) => ({ weeks: [{ weekNumber: n, phase, theme: "T", sessions }] } as unknown as PlanChunk);
const intense = (sessions: PlanSession[]) => sessions.filter(x => ["BIKE_VO2", "BIKE_SEUIL", "RUN_VMA"].includes(x.catalogId ?? ""));

describe("phase spécifique Ironman / 70.3 : une séance seuil ou VO2max par semaine", () => {
  const build = () => week(27, "peak", [s("mardi", "bike", "BIKE_SEUIL", ["Z5"]), s("mercredi", "run", "RUN_VMA", ["Z5"]), s("vendredi", "bike", "BIKE_VO2", ["Z6"]), s("samedi", "bike", "BIKE_RACE_IM", ["Z3"], 90)]);

  it("Ironman : l'excédent est remplacé et signalé, jamais supprimé", () => {
    const chunk = build();
    const rec = runReconciler([chunk], {}, 2, undefined, { objectiveKey: "IM", globalTotalWeeks: 32, beginnerIntensitySignal: null });
    const sessions = chunk.weeks[0].sessions;
    expect(sessions).toHaveLength(4);
    expect(intense(sessions)).toHaveLength(1);
    expect(sessions.filter(x => x.details?.startsWith(SPECIFIC_PHASE_NOTE))).toHaveLength(2);
    expect(rec.counters.specific_intensity_downgraded).toBe(2);
    // L'allure Ironman n'est jamais comptée comme intense.
    expect(sessions.find(x => x.day === "samedi")?.catalogId).toBe("BIKE_RACE_IM");
  });

  it("marathon : la règle ne s'applique pas (règle des confirmés inchangée)", () => {
    const chunk = build();
    runReconciler([chunk], {}, 2, undefined, { objectiveKey: "Marathon", globalTotalWeeks: 32, beginnerIntensitySignal: null });
    expect(intense(chunk.weeks[0].sessions)).toHaveLength(3);
  });

  it("phase de développement Ironman : inchangée", () => {
    const chunk = week(10, "build", build().weeks[0].sessions);
    runReconciler([chunk], {}, 2, undefined, { objectiveKey: "IM", globalTotalWeeks: 32, beginnerIntensitySignal: null });
    expect(intense(chunk.weeks[0].sessions)).toHaveLength(3);
  });

  it("cycle d'une course intermédiaire (marathon avant l'Ironman) : non concerné", () => {
    const chunk = build();
    runReconciler([chunk], {}, 2, undefined, { objectiveKey: "IM", globalTotalWeeks: 32, beginnerIntensitySignal: null,
      intermediateRaces: [{ globalWeek: 28, day: "dimanche", objectiveKey: "Marathon", label: "Séville", priority: "A" }] });
    expect(intense(chunk.weeks[0].sessions)).toHaveLength(3);
  });
});
