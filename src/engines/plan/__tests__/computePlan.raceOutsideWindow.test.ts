import { describe, expect, it } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanGenerationConfig } from "../types";

// Regression reproduced from the real isolated Lovable QA V3/V4 screenshots:
// plan S1 = 2026-11-02 .. 2026-11-08, race date = 2027-05-09.
// Previous getRaceWeekNumber clamped week 27 to S1 and added a phantom race.
function makePlan(durationMin: number): ParsedPlan {
  const session: ParsedSession = {
    weekNumber: 1,
    weekTheme: "Semaine synthétique QA",
    phase: "base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "run",
    title: "QA TEST TECHNIQUE — NE PAS PRESCRIRE",
    details: "Séance fictive de test de sauvegarde.",
    durationMin,
    isRest: false,
  };
  return {
    title: "QA — restauration non prescriptive",
    phases: [],
    totalWeeks: 1,
    weeks: [{
      weekNumber: 1,
      theme: "Semaine synthétique QA",
      phase: "base",
      sessions: [session],
    }],
  };
}

function config(raceDate: string): PlanGenerationConfig {
  return {
    objective: "70.3",
    weeksAvailable: 1,
    mode: "ai",
    ambition: "sub",
    planStartDate: "2026-11-02",
    raceGoals: [{ objective: "70.3", raceDate, priority: "A" }],
  };
}

describe("anchorRaceDays — competition outside the stored plan window", () => {
  it.each([40, 45])("does not add a phantom race or inflate the restored %i-minute week", durationMin => {
    const { plan } = postProcessParsedPlan(makePlan(durationMin), config("2027-05-09"));
    expect(plan.weeks).toHaveLength(1);
    expect(plan.weeks[0].sessions).toHaveLength(1);
    expect(plan.weeks[0].sessions[0].title).toContain("NE PAS PRESCRIRE");
    expect(plan.weeks[0].sessions[0].durationMin).toBe(durationMin);
    expect(plan.weeks[0].computedVolumeMin).toBe(durationMin);
    expect(plan.weeks[0].sessions.some(s => s.title.includes("COURSE OBJECTIF"))).toBe(false);
  });

  it("does not move a past competition to the first week", () => {
    const { plan } = postProcessParsedPlan(makePlan(40), config("2026-10-25"));
    expect(plan.weeks[0].sessions).toHaveLength(1);
    expect(plan.weeks[0].computedVolumeMin).toBe(40);
  });

  it("still anchors a competition actually within S1, exactly once", () => {
    const { plan } = postProcessParsedPlan(makePlan(40), config("2026-11-08"));
    expect(plan.weeks[0].sessions.filter(s => s.title.includes("COURSE OBJECTIF"))).toHaveLength(1);
    expect(plan.weeks[0].sessions.find(s => s.title.includes("COURSE OBJECTIF"))?.dayIndex).toBe(6);
    const again = postProcessParsedPlan(plan, config("2026-11-08")).plan;
    expect(again.weeks[0].sessions.filter(s => s.title.includes("COURSE OBJECTIF"))).toHaveLength(1);
  });
});
