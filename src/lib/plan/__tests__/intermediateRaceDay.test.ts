import { describe, it, expect } from "vitest";
import { intermediateRaceDays } from "@/hooks/useAITrainingPlan";
import { ensureIntermediateRaceDays } from "@/lib/plan/planReconciler";
import { isRaceDaySession } from "@/engines/plan/planValidator";
import type { PlanChunk } from "@/lib/plan/planSchema";

const cfg = {
  planStartDate: "2026-10-26",
  raceGoals: [
    { objective: "IRONMAN 70.3", raceDate: "2027-06-06", priority: "A" as const },
    { objective: "10 KM", raceName: "Corrida", raceDate: "2026-12-19", priority: "B" as const },
  ],
};

describe("course B déclarée — jour de course garanti", () => {
  it("le 10 km du samedi 19/12/2026 tombe en S8 d'un plan démarré le lundi 26/10/2026 ; la course A n'est pas reprise", () => {
    const races = intermediateRaceDays(cfg as never);
    expect(races).toHaveLength(1);
    expect(races[0]).toMatchObject({ globalWeek: 8, day: "samedi", objectiveKey: "10K" });
  });

  it("dans la fenêtre S6-S10, la course est placée le samedi de S8 et remplace les séances de ce jour", () => {
    const week = (n: number) => ({ weekNumber: n, phase: "build", theme: "", sessions: [
      { day: "samedi", sport: "bike", title: "Sortie longue", details: "", durationMin: 180, zones: ["Z2"], custom: false, catalogId: "X" },
      { day: "dimanche", sport: "run", title: "EF", details: "", durationMin: 45, zones: ["Z2"], custom: false, catalogId: "Y" },
    ] });
    const chunks = [{ weeks: [1, 2, 3, 4, 5].map(week) }] as unknown as PlanChunk[];
    ensureIntermediateRaceDays(chunks, intermediateRaceDays(cfg as never), {} as never, [], 5);
    const s8 = chunks[0].weeks[2].sessions;
    const saturday = s8.filter((s) => s.day === "samedi");
    expect(saturday).toHaveLength(1);
    expect(isRaceDaySession({ title: saturday[0].title, details: saturday[0].details })).toBe(true);
    expect(saturday[0].durationMin).toBe(50);
    expect(s8.some((s) => s.day === "dimanche")).toBe(true);
    // Autres semaines intactes.
    expect(chunks[0].weeks[1].sessions.some((s) => isRaceDaySession({ title: s.title, details: s.details }))).toBe(false);
  });
});

import { validatePlanPaces } from "@/lib/validatePlanPaces";
describe("étiquettes d'intensité dans les titres", () => {
  it("une fiche catalogue garde son titre ; le renforcement n'est jamais étiqueté « Tempo »", () => {
    const plan = { title: "", phases: [], totalWeeks: 1, weeks: [{ weekNumber: 1, theme: "", phase: "build", sessions: [
      { weekNumber: 1, weekTheme: "", phase: "build", dayName: "Vendredi", dayIndex: 4, sport: "run", isRest: false,
        title: "Endurance Facile & Accélérations", details: "45min Z2 puis 8x15s en Z3-Z4a", custom: false, catalogId: "A_RUN_EASY_STRIDES_PRO" },
      { weekNumber: 1, weekTheme: "", phase: "build", dayName: "Lundi", dayIndex: 0, sport: "strength", isRest: false,
        title: "Full body", details: "Squats tempo 3-1-1", custom: true, catalogId: null },
      { weekNumber: 1, weekTheme: "", phase: "build", dayName: "Mardi", dayIndex: 1, sport: "run", isRest: false,
        title: "Séance libre", details: "2x20min seuil", custom: true, catalogId: null },
    ] }] };
    validatePlanPaces(plan as never, null);
    const [run, str, custom] = plan.weeks[0].sessions;
    expect(run.title).toBe("Endurance Facile & Accélérations");
    expect(str.title).toBe("Full body");
    expect(custom.title.startsWith("[LT2")).toBe(true);
  });
});
