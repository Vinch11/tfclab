import { describe, it, expect } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import type { ParsedPlan, ParsedSession, ParsedWeek } from "@/lib/aiPlanParser";
import type { PlanGenerationConfig } from "../types";

// Audit coach (plan Manu, 40 sem, Ironman le 05/10/2026 depuis un départ le
// 05/01/2026 → vraie semaine de course = S40) : `anchorRaceDays` calculait la
// semaine de course en plafonnant sur `plan.weeks.length` (le nombre de
// semaines RÉELLEMENT présentes) au lieu de `config.weeksAvailable` (la durée
// INTENDUE du plan) — sur un plan tronqué en amont (32/40 semaines reçues),
// ça fabriquait un faux jour de course sur la DERNIÈRE semaine présente (S32)
// au lieu de ne rien fabriquer, désactivant de fait le garde-fou
// `if (!targetWeek) continue`.

function makeSession(weekNumber: number, dayIndex: number): ParsedSession {
  return {
    weekNumber,
    weekTheme: "Base",
    phase: "base",
    dayName: "Mardi",
    dayIndex,
    sport: "Vélo",
    title: "Sortie endurance",
    details: "Z2 90min.",
    isRest: false,
  };
}

function makeWeeks(count: number): ParsedWeek[] {
  return Array.from({ length: count }, (_, i) => ({
    weekNumber: i + 1,
    theme: "Base",
    phase: "base",
    sessions: [makeSession(i + 1, 1)],
  }));
}

function makePlan(weekCount: number): ParsedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: weekCount,
    weeks: makeWeeks(weekCount),
  };
}

const baseConfig: PlanGenerationConfig = {
  objective: "IM",
  weeksAvailable: 40,
  mode: "ai",
  ambition: "age_group",
  planStartDate: "2026-01-05",
  raceGoals: [{ objective: "IM", raceDate: "2026-10-05", priority: "A" }],
};

function hasRaceDay(plan: ParsedPlan): boolean {
  return plan.weeks.some((w) => w.sessions.some((s) => s.title.includes("COURSE OBJECTIF")));
}

describe("anchorRaceDays — plan tronqué (moins de semaines que config.weeksAvailable)", () => {
  it("ne fabrique AUCUN jour de course sur la dernière semaine présente quand le plan est tronqué (32/40 sem)", () => {
    const { plan } = postProcessParsedPlan(makePlan(32), baseConfig);
    expect(hasRaceDay(plan)).toBe(false);
    const week32 = plan.weeks.find((w) => w.weekNumber === 32)!;
    expect(week32.sessions.some((s) => s.title.includes("COURSE OBJECTIF"))).toBe(false);
  });

  it("place correctement le jour de course sur S40 quand le plan est complet (40/40 sem)", () => {
    const { plan } = postProcessParsedPlan(makePlan(40), baseConfig);
    const week40 = plan.weeks.find((w) => w.weekNumber === 40)!;
    expect(week40.sessions.some((s) => s.title.includes("COURSE OBJECTIF"))).toBe(true);
    // Aucune autre semaine ne doit porter le jour de course.
    const weeksWithRaceDay = plan.weeks.filter((w) => w.sessions.some((s) => s.title.includes("COURSE OBJECTIF")));
    expect(weeksWithRaceDay.map((w) => w.weekNumber)).toEqual([40]);
  });
});
