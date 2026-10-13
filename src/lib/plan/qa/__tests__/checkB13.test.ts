import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession, MergedWeek } from "@/lib/plan/mergePlanChunks";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "BUILD_ONLY_RUN",
      cat: "B", sport: "run", objectif: "Séance build", necessite: "Recommandé",
      when: "", phase: ["build"], avoid: "",
      durationMin: [40, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Seuil", zones: ["Z4"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
    {
      id: "SLEEP_LOW_RUN",
      cat: "A", sport: "run", objectif: "Sleep Low double day", necessite: "Recommandé",
      when: "", phase: ["base", "build"], avoid: "",
      durationMin: [45, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2 à jeun", zones: ["Z2"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB13, checkB13ToValidationIssues } from "../checkB13";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base", dayName: "Lundi", dayIndex: 0,
    sport: "run", title: "Séance", details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: false, durationMin: 45, zones: [],
    ...overrides,
  };
}

function makePlan(weeks: Array<{ phase: string; sessions: MergedSession[] }>): MergedPlan {
  return {
    title: "P", phases: [], totalWeeks: weeks.length,
    weeks: weeks.map((w, i): MergedWeek => ({
      weekNumber: i + 1, theme: "S", phase: w.phase, sessions: w.sessions,
    })),
  };
}

describe("checkB13 — invariants CRITIQUES post-mutations (F12 : dédoublonnage / cumul à jeun)", () => {
  it("plan propre → pass, level critical", () => {
    const plan = makePlan([
      { phase: "build", sessions: [makeSession({ catalogId: "BUILD_ONLY_RUN", weekNumber: 1 })] },
    ]);
    const r = checkB13(plan);
    expect(r.pass).toBe(true);
    expect(r.level).toBe("critical");
    expect(r.id).toBe("B13");
  });

  it("catalogId dupliqué dans la même semaine (post-mutations) → fail critique, signalé", () => {
    const plan = makePlan([
      { phase: "build", sessions: [
        makeSession({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
        makeSession({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }),
      ] },
    ]);
    const r = checkB13(plan);
    expect(r.pass).toBe(false);
    expect(r.level).toBe("critical");
    expect(r.details.some((d) => /utilisé 2×/.test(d))).toBe(true);
  });

  it("2 séances à jeun dans la même semaine (post-mutations) → fail critique, signalé", () => {
    const plan = makePlan([
      { phase: "build", sessions: [
        makeSession({ catalogId: "SLEEP_LOW_RUN", title: "Sleep Low double day", dayName: "Mardi" }),
        makeSession({ catalogId: "SLEEP_LOW_RUN", title: "Sortie longue à jeun", details: "", dayName: "Dimanche" }),
      ] },
    ]);
    const r = checkB13(plan);
    expect(r.pass).toBe(false);
    expect(r.details.some((d) => /à jeun/.test(d))).toBe(true);
  });

  it("ne modifie jamais le plan (lecture seule) — aucune mutation de session/catalogId", () => {
    const session = makeSession({ catalogId: "BUILD_ONLY_RUN" });
    const plan = makePlan([{ phase: "taper", sessions: [session] }]);
    const before = JSON.stringify(session);
    checkB13(plan);
    expect(JSON.stringify(session)).toBe(before);
  });
});

describe("checkB13ToValidationIssues", () => {
  it("plan propre → liste vide", () => {
    const plan = makePlan([{ phase: "build", sessions: [makeSession({ catalogId: "BUILD_ONLY_RUN" })] }]);
    expect(checkB13ToValidationIssues(checkB13(plan))).toEqual([]);
  });

  it("doublon détecté → une issue de sévérité 'error'", () => {
    const plan = makePlan([
      { phase: "build", sessions: [
        makeSession({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
        makeSession({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }),
      ] },
    ]);
    const issues = checkB13ToValidationIssues(checkB13(plan));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].rule).toBe("final_validation_critical");
  });
});
