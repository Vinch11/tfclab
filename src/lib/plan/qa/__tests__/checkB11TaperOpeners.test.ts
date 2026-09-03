import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Openers J-2 — DOIT pouvoir être placé en race-week
    {
      id: "OPENER_RUN_J2",
      cat: "B", sport: "run", objectif: "openers", necessite: "Obligatoire",
      when: "J-2 avant course",
      avoid: "Jamais >J-2",
      phase: ["build", "peak", "taper"],
      durationMin: [25, 35], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "25' Z2 + 4x30\" Z5", zones: ["Z2", "Z5"] }],
      variants: {},
    },
    // Fiche vraiment interdite en race-week
    {
      id: "HARD_INTERVAL_TAPER_BAN",
      cat: "A", sport: "run", objectif: "vo2max", necessite: "Recommandé",
      when: "Build/Peak",
      avoid: "J-7 avant course · Fatigue >6/10",
      phase: ["build", "peak"],
      durationMin: [60, 75], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "6x3' Z5", zones: ["Z5"] }],
      variants: {},
    },
    // Faux positif possible : mention incidente "Alcool J-1"
    {
      id: "NUTRITION_TEST",
      cat: "D", sport: "run", objectif: "test nutrition", necessite: "Recommandé",
      when: "Peak",
      avoid: "Nouveauté le jour J · Aliments non testés · Alcool J-1",
      phase: ["peak", "taper"],
      durationMin: [45, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "45' Z2 test nutrition", zones: ["Z2"] }],
      variants: {},
    },
    // Bug réel confirmé (2 plans "Vince" réels) : fiche CONÇUE pour le taper
    // (phase=["taper"], when="Semaine taper...") mais dont Éviter mentionne
    // "taper" comme mise en garde sur le CONTENU ("reste léger"), pas comme
    // exclusion de placement. Le catch-all sans J-N ne doit PAS la flaguer.
    {
      id: "D_ACTIVATION_CORE_TAPER",
      cat: "D", sport: "mixed", objectif: "Gainage léger taper", necessite: "Recommandé",
      when: "Semaine taper, maintien tonus sans charge",
      avoid: "Charge lourde en semaine taper",
      phase: ["taper"],
      durationMin: [10, 15], metricKey: "cardiaque", sportKey: "tout sport",
      structure: [{ part: "Main", text: "gainage léger", zones: [] }],
      variants: {},
    },
    // Fiche réellement interdite en taper via le catch-all SANS J-N (motif
    // réel du catalogue, ex: C_STR_MAX_LOWER_HEAVY) — ne doit PAS régresser.
    {
      id: "HEAVY_STRENGTH_NO_TAPER_TAG",
      cat: "C", sport: "strength", objectif: "force max", necessite: "Recommandé",
      when: "Base/Build",
      avoid: "Tapering · Fatigue >7/10",
      phase: ["base", "build"],
      durationMin: [45, 60], metricKey: "force", sportKey: "strength",
      structure: [{ part: "Main", text: "squat lourd", zones: [] }],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB11 } from "../checksB10B11";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 3, weekTheme: "Race", phase: "taper", dayName: "Vendredi", dayIndex: 4,
    sport: "run", title: "S", details: "", isRest: false, isKeySession: true,
    catalogId: null, custom: false, durationMin: 30, zones: [],
    ...overrides,
  };
}

function makePlan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "P", phases: [], totalWeeks: 3,
    weeks: [
      { weekNumber: 1, theme: "Build", phase: "build", sessions: [] },
      { weekNumber: 2, theme: "Peak", phase: "peak", sessions: [] },
      { weekNumber: 3, theme: "Race", phase: "taper", sessions },
    ],
  };
}

describe("B11 — sémantique des exclusions J-N en race-week", () => {
  it("Openers 'Jamais >J-2' avec when='J-2 avant course' → PASS en race-week", () => {
    const plan = makePlan([makeSession({ catalogId: "OPENER_RUN_J2" })]);
    const r = checkB11(plan, "semi");
    const raceWeekFail = r.details.some(d => /OPENER_RUN_J2.*race-week/i.test(d));
    expect(raceWeekFail).toBe(false);
  });

  it("Fiche VO2 avec avoid='J-7 avant course' → FAIL en race-week", () => {
    const plan = makePlan([makeSession({ catalogId: "HARD_INTERVAL_TAPER_BAN" })]);
    const r = checkB11(plan, "semi");
    const flagged = r.details.some(d => /HARD_INTERVAL_TAPER_BAN.*race-week/i.test(d));
    expect(flagged).toBe(true);
  });

  it("Mention incidente 'Alcool J-1' dans avoid → NE flagge PAS en race-week", () => {
    const plan = makePlan([makeSession({ catalogId: "NUTRITION_TEST" })]);
    const r = checkB11(plan, "semi");
    const flagged = r.details.some(d => /NUTRITION_TEST.*race-week/i.test(d));
    expect(flagged).toBe(false);
  });

  it("Fiche conçue pour le taper (phase=['taper']) avec Éviter='Charge lourde en semaine taper' → NE flagge PAS (bug réel 'D_ACTIVATION_CORE_TAPER')", () => {
    const plan = makePlan([makeSession({ catalogId: "D_ACTIVATION_CORE_TAPER" })]);
    const r = checkB11(plan, "70.3");
    const flagged = r.details.some(d => /D_ACTIVATION_CORE_TAPER.*race-week/i.test(d));
    expect(flagged).toBe(false);
  });

  it("Fiche sans phase=['taper'] avec Éviter='Tapering · Fatigue >7/10' → FAIL toujours en race-week (pas de régression)", () => {
    const plan = makePlan([makeSession({ catalogId: "HEAVY_STRENGTH_NO_TAPER_TAG" })]);
    const r = checkB11(plan, "70.3");
    const flagged = r.details.some(d => /HEAVY_STRENGTH_NO_TAPER_TAG.*race-week/i.test(d));
    expect(flagged).toBe(true);
  });
});
