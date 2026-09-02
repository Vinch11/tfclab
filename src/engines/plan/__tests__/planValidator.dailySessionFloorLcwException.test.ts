import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (dialog "problèmes critiques" à la
 * sauvegarde) : après le fix qui fait enfin apparaître le week-end signature
 * LCW ("🔑 LCW Long Bike SAT", "🔑 LCW Run Off-Legs SUN"), la Règle #21
 * Plancher séances/jour (World Class/Elite/Competitor IM/70.3 : 2-3
 * séances/jour) les flague comme "1 seule séance — ERREUR GRAVE". Même chose
 * pour "Triple brick — simulation enchaînement complet S/B/R" et "Brick
 * natation→vélo — T1 simulation". Ces séances combinent DÉJÀ 2-3 disciplines
 * dans une seule ligne du plan — le plancher mesure le nombre de
 * disciplines/stimuli du jour, pas le nombre de lignes dans le tableau.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Chantier",
    phase: "Chantier",
    dayName: "Samedi",
    dayIndex: 5,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "Chantier"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({ weekNumber, weekTheme: theme, dayIndex: s.dayIndex ?? i, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 70.3 LCW Test — 7 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateDailySessionFloor — exemption brick / signature LCW (une séance = plusieurs disciplines)", () => {
  it("ne flague pas une fiche signature LCW seule sur son jour (samedi long bike race-pace)", () => {
    const week = makeWeek(5, [
      { dayIndex: 5, dayName: "Samedi", sport: "Vélo", title: "🔑 LCW Long Bike SAT", catalogId: "B_LCW_BIKE_LONG_RACE_SAT" },
      { dayIndex: 6, dayName: "Dimanche", sport: "Course", title: "🔑 LCW Run Off-Legs SUN", catalogId: "B_LCW_RUN_OFF_LEGS_SUN" },
    ]);
    const result = validatePlan(makePlan([week]), "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "competitor");
    expect(result.issues.filter((i) => i.rule === "daily_session_floor")).toHaveLength(0);
  });

  it("ne flague pas une séance brick multi-discipline seule sur son jour (triple brick S/B/R)", () => {
    const week = makeWeek(3, [
      { dayIndex: 5, dayName: "Samedi", sport: "Mixte", title: "Triple brick — simulation enchaînement complet S/B/R", details: "" },
    ]);
    const result = validatePlan(makePlan([week]), "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "competitor");
    expect(result.issues.filter((i) => i.rule === "daily_session_floor")).toHaveLength(0);
  });

  it("continue de flaguer une vraie séance unique NON-brick (pas d'exemption abusive)", () => {
    const week = makeWeek(1, [
      { dayIndex: 4, dayName: "Vendredi", sport: "Course", title: "🔑 Hill Skills", details: "Footing côtes" },
    ]);
    const result = validatePlan(makePlan([week]), "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "competitor");
    const issue = result.issues.find((i) => i.rule === "daily_session_floor" && i.severity === "error");
    expect(issue).toBeDefined();
  });
});
