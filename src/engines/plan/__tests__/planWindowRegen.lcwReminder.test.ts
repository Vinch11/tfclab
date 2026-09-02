import { describe, it, expect } from "vitest";
import { buildWindowRegenConfig } from "../planWindowRegen";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanConfig, PlanAthleteData } from "@/hooks/useAITrainingPlan";

/**
 * Bug réel signalé par le coach : régénérer une fenêtre du plan (ou une
 * semaine seule) ne faisait jamais apparaître le week-end signature LCW
 * (B_LCW_BIKE_LONG_RACE_SAT + B_LCW_RUN_OFF_LEGS_SUN), même après plusieurs
 * tentatives — "quand je régénère juste la semaine rien ne change". Cause
 * racine : la checklist "bloquante" du prompt (promptHelpers.ts) porte sur un
 * QUOTA multi-semaines, mais rien ne dit explicitement à l'IA, au moment de
 * régénérer UNE fenêtre, que ce quota n'est pas déjà rempli ailleurs dans le
 * plan. `buildWindowRegenConfig` a une visibilité sur le plan ENTIER
 * (`req.currentPlan`) : on vérifie réellement plutôt que de deviner.
 */
function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "Base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Endurance Z2",
    details: "",
    isRest: false,
    ...over,
  };
}

function makePlan(totalWeeks: number, extraSessionsByWeek: Record<number, Partial<ParsedSession>[]> = {}): ParsedPlan {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNumber = i + 1;
    return {
      weekNumber,
      theme: `Semaine ${weekNumber}`,
      phase: "Build",
      sessions: [
        makeSession({ weekNumber, dayIndex: 0, dayName: "Lundi", title: "Repos", sport: "Repos", isRest: true }),
        makeSession({ weekNumber, dayIndex: 1, dayName: "Mardi", title: "Endurance Z2" }),
        ...(extraSessionsByWeek[weekNumber] || []).map((s) => makeSession({ weekNumber, ...s })),
      ],
    };
  });
  return { title: "Plan Test LCW", phases: [], totalWeeks, weeks };
}

const athleteData: PlanAthleteData = {};
const lcwConfig: PlanConfig = {
  objective: "703",
  weeksAvailable: 7,
  weeklyHours: 10,
  raceGoals: [{ objective: "70.3", priority: "A", raceFormat: "lcw_3day" }],
};
const continuousConfig: PlanConfig = { objective: "703", weeksAvailable: 7, weeklyHours: 10 };

describe("planWindowRegen — rappel LCW explicite (checklist multi-semaines)", () => {
  it("rappelle les IDs signature LCW manquants quand ils sont absents de tout le plan", () => {
    const plan = makePlan(7);
    const { config } = buildWindowRegenConfig({
      fromWeek: 5,
      toWeek: 6,
      currentPlan: plan,
      athleteData,
      baseConfig: lcwConfig,
    });
    expect(config.constraints).toMatch(/B_LCW_BIKE_LONG_RACE_SAT/);
    expect(config.constraints).toMatch(/B_LCW_RUN_OFF_LEGS_SUN/);
    expect(config.constraints).toMatch(/bloquante.*ENCORE NON SATISFAITE/i);
  });

  it("ne rappelle PAS un ID déjà présent ailleurs dans le plan (hors de la fenêtre régénérée)", () => {
    const plan = makePlan(7, {
      3: [
        { dayIndex: 5, dayName: "Samedi", sport: "Vélo", title: "Long ride LCW", catalogId: "B_LCW_BIKE_LONG_RACE_SAT" },
        { dayIndex: 6, dayName: "Dimanche", sport: "Course", title: "Off-legs run", catalogId: "B_LCW_RUN_OFF_LEGS_SUN" },
      ],
    });
    const { config } = buildWindowRegenConfig({
      fromWeek: 5,
      toWeek: 6,
      currentPlan: plan,
      athleteData,
      baseConfig: lcwConfig,
    });
    expect(config.constraints).not.toMatch(/B_LCW_BIKE_LONG_RACE_SAT/);
    expect(config.constraints).not.toMatch(/ENCORE NON SATISFAITE/i);
  });

  it("ne rappelle rien pour un plan qui n'est pas au format LCW", () => {
    const plan = makePlan(7);
    const { config } = buildWindowRegenConfig({
      fromWeek: 5,
      toWeek: 6,
      currentPlan: plan,
      athleteData,
      baseConfig: continuousConfig,
    });
    expect(config.constraints).not.toMatch(/LCW/);
  });
});
