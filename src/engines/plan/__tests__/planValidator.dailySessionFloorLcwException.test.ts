import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Règle 21 "Plancher séances/jour Elite+" DÉSACTIVÉE (décision coach,
 * revue du premier plan réel B-10K-TO-70.3, 2026-10-21) : 1 ou 2 séances/jour
 * restent des choix sportifs légitimes, l'ambition elite ne doit jamais
 * imposer artificiellement une séance supplémentaire — cf.
 * planValidator.ts::validateDailySessionFloor. Ce fichier vérifie que la
 * règle ne flague plus AUCUN cas, y compris les vraies séances uniques
 * non-brick qu'elle flaguait auparavant (ancien comportement conservé en
 * commentaire par traçabilité historique).
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

describe("validateDailySessionFloor — règle désactivée (décision coach 2026-10-21)", () => {
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

  it("ne flague PLUS une vraie séance unique NON-brick (ancien comportement : ERREUR GRAVE — désactivé, 1 séance/jour est un choix légitime)", () => {
    const week = makeWeek(1, [
      { dayIndex: 4, dayName: "Vendredi", sport: "Course", title: "🔑 Hill Skills", details: "Footing côtes" },
    ]);
    const result = validatePlan(makePlan([week]), "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "competitor");
    expect(result.issues.filter((i) => i.rule === "daily_session_floor")).toHaveLength(0);
  });

  it("ne flague rien non plus pour World Class, quel que soit le nombre de séances/jour", () => {
    const week = makeWeek(1, [
      { dayIndex: 1, dayName: "Lundi", sport: "Course", title: "Footing seul", details: "" },
    ]);
    const result = validatePlan(makePlan([week]), "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "world_class");
    expect(result.issues.filter((i) => i.rule === "daily_session_floor")).toHaveLength(0);
  });
});
