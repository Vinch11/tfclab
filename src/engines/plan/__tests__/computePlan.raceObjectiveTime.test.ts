import { describe, it, expect } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanGenerationConfig, PlanAthleteData } from "../types";

function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Course",
    phase: "taper",
    dayName: "Dimanche",
    dayIndex: 0,
    sport: "Course",
    title: "🏁 COURSE : 10 km",
    details: "Échauffement 15' Z1. Course 10km : Objectif 43:17 (Allure @ allure course).",
    isRest: false,
    ...over,
  };
}

/**
 * BUG constaté deux fois sur des plans réels : la fiche du jour de course
 * affiche un temps objectif ("43'17") incohérent avec le snapshot
 * physiologique de l'athlète (VMA 16.5 km/h → ~38-39min sur 10K), en
 * contradiction avec le titre du plan et le panneau Gap Ambition. Le
 * correctif prompt (promptHelpers.ts) ne suffisait pas à garantir la
 * cohérence — dedupRaceDays applique maintenant une correction déterministe
 * post-génération, source unique deriveRaceTargets.
 */
function makePlan(): ParsedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: 1,
    weeks: [
      {
        weekNumber: 1,
        theme: "Semaine de course",
        phase: "taper",
        sessions: [makeSession({})],
      },
    ],
  };
}

const baseConfig: PlanGenerationConfig = {
  objective: "10K",
  weeksAvailable: 1,
  mode: "ai",
  ambition: "sub",
  planStartDate: "2026-08-03",
  raceGoals: [
    { objective: "10K", raceDate: "2026-08-06", priority: "A" },
  ],
};

const athleteData: PlanAthleteData = { vma: 16.5 };

describe("dedupRaceDays — correction déterministe du temps objectif du jour de course", () => {
  it("corrige un temps objectif incohérent avec le snapshot physiologique", () => {
    const { plan } = postProcessParsedPlan(makePlan(), baseConfig, athleteData);
    const raceSession = plan.weeks[0].sessions.find((s) => s.title.includes("COURSE"));
    expect(raceSession).toBeDefined();
    expect(raceSession!.details).not.toContain("43:17");
    // ~10km à VMA 16.5 (ambition "sub") doit converger vers un temps sub-42min,
    // formaté en mm'ss" (formatSecToTime) — pas en "Xh YY".
    expect(raceSession!.details).toMatch(/Objectif \d{2}'\d{2}"/);
  });

  it("ne touche pas au temps objectif si le coach a saisi un temps cible explicite", () => {
    const config: PlanGenerationConfig = {
      ...baseConfig,
      raceGoals: [
        { objective: "10K", raceDate: "2026-08-06", priority: "A", targetTimeMinutes: 43 },
      ],
    };
    const { plan } = postProcessParsedPlan(makePlan(), config, athleteData);
    const raceSession = plan.weeks[0].sessions.find((s) => s.title.includes("COURSE"));
    expect(raceSession!.details).toContain("43:17");
  });

  it("ne fait rien sans données athlète (snapshot indisponible)", () => {
    const { plan } = postProcessParsedPlan(makePlan(), baseConfig, undefined);
    const raceSession = plan.weeks[0].sessions.find((s) => s.title.includes("COURSE"));
    expect(raceSession!.details).toContain("43:17");
  });
});
