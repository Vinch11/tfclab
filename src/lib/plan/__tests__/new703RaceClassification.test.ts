import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { isRaceDaySession, validatePlan } from "@/engines/plan/planValidator";
import { isRaceEventTitle } from "../../../../supabase/functions/_shared/raceDayIdentity";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";

import { computeGoalWeekFromDates } from "../multiObjectiveClassification";
import { computeGoalWeekForConfig } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

// Fixtures synthétiques ; aucune transcription prétendue des nouvelles captures manquantes.
const fiche = WorkoutLibrary.find(w => w.id === "V3_RUN_10K_RACE_SIM")!;
const simulation = { title: fiche.objectif, details: fiche.structure.map(p => `${p.part}: ${p.text}`).join(" | ") };

describe("compétition / simulation — cohérence du classificateur partagé", () => {
  it("la vraie fiche de simulation 10 km reste un entraînement malgré 'échauffement compétition' dans les consignes", () => {
    expect(isRaceEventTitle(simulation)).toBe(false);
    expect(isRaceDaySession(simulation)).toBe(false);
  });
  it.each(["Activation jour de course", "Simulation 🏁 course objectif", "Entraînement allure compétition"])("ne transforme pas %s en événement", title => {
    expect(isRaceDaySession({ title, details: "Rappel pour le jour de course de l'objectif A." })).toBe(false);
  });
  it("ne marque pas une séance normale comme course à cause d'une simple référence à l'objectif dans les consignes", () => {
    expect(isRaceDaySession({ title: "Endurance fondamentale", details: "45 min Z2. Prévoir la tenue du jour de course." })).toBe(false);
  });
  it("les vrais événements restent identifiables même si leurs consignes décrivent l'échauffement ou l'activation", () => {
    expect(isRaceDaySession({ title: "COURSE : IRONMAN 70.3 TOURS", details: "Activation puis compétition officielle." })).toBe(true);
    expect(isRaceDaySession({ title: "🏁 OBJECTIF B — 10 km WSL", details: "Course officielle le 19 décembre" })).toBe(true);
  });
  it("la validation distingue entraînements S24/S25 et vraie course non déclarée ; garde l'absence S33 bloquante", () => {
    const session = (weekNumber: number, title: string, details: string): ParsedSession => ({
      weekNumber, weekTheme: "Préparation", phase: "build", dayName: "Samedi", dayIndex: 5,
      sport: "run", title, details, isRest: false,
    });
    const plan: ParsedPlan = { title: "703", totalWeeks: 33, phases: [], weeks: [
      { weekNumber: 24, phase: "build", theme: "Préparation", sessions: [session(24, simulation.title, simulation.details)] },
      { weekNumber: 25, phase: "build", theme: "Préparation", sessions: [session(25, "Activation jour de course", "20 min Z1")] },
      { weekNumber: 33, phase: "taper", theme: "Course", sessions: [session(33, "Mobilité", "20 min souples")] },
    ] };
    const before = structuredClone(plan);
    expect(validatePlan(plan, "703", undefined, [9, 33]).issues.filter(i => i.rule === "race_day_unexpected")).toEqual([]);
    expect(validatePlan(plan, "703", undefined, [9, 33]).issues.some(i => i.rule === "race_day" && i.week === 33 && i.severity === "error")).toBe(true);
    expect(plan).toEqual(before); // aucune suppression ni ajout pour satisfaire le contrôle
    plan.weeks[0].sessions[0].title = "COURSE : 10 km non déclaré";
    expect(validatePlan(plan, "703", undefined, [9, 33]).issues.some(i => i.rule === "race_day_unexpected" && i.week === 24 && i.severity === "error")).toBe(true);
  });
  it.each([
    ["2026-10-19", [9, 33]],
    ["2026-10-26", [8, 32]],
  ] as const)("les semaines des deux objectifs dépendent du début %s, identiquement client/serveur", (planStartDate, expected) => {
    const dates = ["2026-12-19", "2027-06-06"];
    expect(dates.map(date => computeGoalWeekFromDates(planStartDate, date))).toEqual(expected);
    expect(dates.map((raceDate, index) => computeGoalWeekForConfig({ planStartDate, weeksAvailable: 33 }, { raceDate }, { isLast: index === 1 }))).toEqual(expected);
  });

});
