import { describe, it, expect } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanGenerationConfig } from "../types";

/** Delivered endurance time: primary prescription, never a fabricated sport fallback. */

function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "base",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Sortie",
    details: "",
    isRest: false,
    ...over,
  };
}

function makePlan(session: ParsedSession): ParsedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: 1,
    weeks: [
      {
        weekNumber: 1,
        theme: "Semaine 1",
        phase: "base",
        sessions: [session],
      },
    ],
  };
}

const baseConfig: PlanGenerationConfig = {
  objective: "70.3",
  weeksAvailable: 1,
  mode: "ai",
  ambition: "sub",
};

describe("postProcessParsedPlan — durée de la prescription principale", () => {
  it("un texte avec deux mentions de durée (90min et 60min) donne un volume de 90min (max), pas 150min (somme)", () => {
    const session = makeSession({
      details: "Sortie 90min. Version courte alternative 60min si fatigue.",
    });
    const { plan } = postProcessParsedPlan(makePlan(session), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBe(90);
  });

  it.each([
    ["60min Z2. Alternative longue 90min si disponible.", 60],
    ["30min échauffement + 45min Z2 + 15min retour au calme", 90],
    ["30min échauffement (alternative courte 15min) + 45min Z2 + 15min retour au calme", 90],
    ["90min Z2, alternative courte 60min si fatigue.", 90],
  ])("ne confond pas étapes et variantes : %s", (details, minutes) => {
    const { plan } = postProcessParsedPlan(makePlan(makeSession({ details })), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBe(minutes);
  });

  it("conserve la durée choisie par le coach", () => {
    const { plan } = postProcessParsedPlan(makePlan(makeSession({ durationMin: 60, details: "90min. Alternative courte 60min." })), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBe(60);
  });

  it("une durée absente reste inconnue et visible", () => {
    const session = makeSession({ sport: "Vélo", title: "Endurance", details: "Rouler tranquillement en Z2." });
    const { plan } = postProcessParsedPlan(makePlan(session), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBeUndefined();
    expect(plan.weeks[0].computedVolumeStr).toBe("Durées à préciser");
  });
});
