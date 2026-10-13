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
      id: "TAPER_RUN",
      cat: "A", sport: "run", objectif: "Affûtage", necessite: "Recommandé",
      when: "", phase: ["taper"], avoid: "",
      durationMin: [20, 30], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Allure course courte", zones: ["Z3"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB14, checkB14ToValidationIssues } from "../checkB14";

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

describe("checkB14 — cohérence phase/fiche post-mutations (F12 : enforceTaperWeeks)", () => {
  it("plan propre (phase cohérente avec la fiche) → pass, level warning", () => {
    const plan = makePlan([
      { phase: "build", sessions: [makeSession({ catalogId: "BUILD_ONLY_RUN" })] },
      { phase: "taper", sessions: [makeSession({ catalogId: "TAPER_RUN" })] },
    ]);
    const r = checkB14(plan);
    expect(r.pass).toBe(true);
    expect(r.level).toBe("warning");
    expect(r.id).toBe("B14");
  });

  it("F12 — fiche choisie pour 'build' mais semaine reclassée 'taper' après coup → fail, signalé en warning (pas critique)", () => {
    // Reproduit le scénario F12 : dedupeWithinWeek a choisi BUILD_ONLY_RUN
    // pour une semaine qui était "build" à ce moment-là, mais
    // enforceTaperWeeks l'a reclassée "taper" plus tard dans le pipeline.
    const plan = makePlan([
      { phase: "taper", sessions: [makeSession({ catalogId: "BUILD_ONLY_RUN" })] },
    ]);
    const r = checkB14(plan);
    expect(r.pass).toBe(false);
    expect(r.level).toBe("warning");
    expect(r.details.some((d) => /phase actuelle: taper/.test(d) && /BUILD_ONLY_RUN/.test(d))).toBe(true);
  });

  it("les séances custom (sans catalogId) ne sont jamais vérifiées en cohérence phase", () => {
    const plan = makePlan([
      { phase: "taper", sessions: [makeSession({ custom: true, catalogId: null, title: "Séance libre" })] },
    ]);
    expect(checkB14(plan).pass).toBe(true);
  });

  it("ne modifie jamais le plan (lecture seule)", () => {
    const session = makeSession({ catalogId: "BUILD_ONLY_RUN" });
    const plan = makePlan([{ phase: "taper", sessions: [session] }]);
    const before = JSON.stringify(session);
    checkB14(plan);
    expect(JSON.stringify(session)).toBe(before);
  });
});

describe("checkB14ToValidationIssues", () => {
  it("incohérence détectée → une issue de sévérité 'warning' (jamais 'error')", () => {
    const plan = makePlan([{ phase: "taper", sessions: [makeSession({ catalogId: "BUILD_ONLY_RUN" })] }]);
    const issues = checkB14ToValidationIssues(checkB14(plan));
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("warning");
  });
});
