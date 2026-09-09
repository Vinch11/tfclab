import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Fix F1 (audit "génération de plan IA", vague 6 — solidité scientifique) :
 * `scheduledWeekType` (validateKeySessions, fix A7 ci-dessus) est calculé par
 * `inferWeekType`, qui applique désormais un cycle de décharge resserré 2:1
 * (toutes les 3 semaines) dès 40 ans — au lieu du cycle 3:1 (4 semaines) par
 * défaut — conformément au PROFIL MASTER du prompt (Tanaka/Seals : "Charge
 * 2:1" dès 40 ans, "STRICTE ... jamais 3:1" dès 50 ans). Ce test vérifie que
 * l'âge de l'athlète (PlanAthleteData.age, 7e paramètre de validatePlan)
 * atteint bien ce calcul et déplace effectivement l'exemption.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "EF Z2 45min",
    details: "Endurance fondamentale",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "build"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makeCompliantWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { title: "EF Z2 45min", details: "Endurance" },
    { title: "Intervalles seuil 3x10min", details: "Séance clé 🔑 Z5" },
    { title: "Sortie longue 20km", details: "SL progressive 🔑" },
    { title: "Repos", sport: "Repos", isRest: true, details: "" },
  ]);
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — Marathon — 12 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

// Marathon sur 12 semaines : taperWeeksForObjective("Marathon")=2 → S10-S11
// taper, S12 race. S3 n'est ni taper ni race, et 3%4≠0 : "load" par défaut,
// mais 3%3===0 dès que le cycle 2:1 (≥40 ans) s'applique → "recovery".
function planWithWeek3NonCompliant(): ParsedPlan {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1).map((n) =>
    n === 3
      ? makeWeek(3, [
          { title: "EF Z2 30min", details: "Endurance légère" },
          { title: "EF Z2 25min", details: "Footing" },
        ])
      : makeCompliantWeek(n),
  );
  return makePlan(weeks);
}

describe("validateKeySessions — scheduledWeekType tient compte de l'âge (fix F1)", () => {
  it("< 40 ans (ou âge absent) : S3/12 Marathon reste 'load' canonique (cycle 3:1) → flaguée sans séance clé", () => {
    const result = validatePlan(planWithWeek3NonCompliant(), "Marathon");
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("35 ans (< 40) : comportement identique, S3/12 reste flaguée", () => {
    const result = validatePlan(
      planWithWeek3NonCompliant(), "Marathon", undefined, undefined, undefined, undefined,
      { age: 35 } as any,
    );
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeDefined();
  });

  it("≥ 40 ans : S3/12 devient 'recovery' (cycle 2:1) → exemptée malgré l'absence de séance clé", () => {
    const result = validatePlan(
      planWithWeek3NonCompliant(), "Marathon", undefined, undefined, undefined, undefined,
      { age: 45 } as any,
    );
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeUndefined();
  });

  it("≥ 50 ans : même exemption (cycle 2:1 STRICT)", () => {
    const result = validatePlan(
      planWithWeek3NonCompliant(), "Marathon", undefined, undefined, undefined, undefined,
      { age: 52 } as any,
    );
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeUndefined();
  });
});

/**
 * Override coach explicite (PlanConfig.deloadCadenceWeeks, dernier paramètre
 * de validatePlan) — permet de forcer un cycle 2:1 ou 3:1 indépendamment de
 * l'âge, prioritaire sur l'auto-détection.
 */
describe("validateKeySessions — deloadCadenceWeeks (override coach) prime sur l'âge", () => {
  it("coach force 2:1 (3) pour un jeune athlète (< 40 ans) : S3/12 devient 'recovery' → exemptée", () => {
    const result = validatePlan(
      planWithWeek3NonCompliant(), "Marathon", undefined, undefined, undefined, undefined,
      { age: 28 } as any, undefined, undefined, undefined, undefined, undefined, undefined,
      3,
    );
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeUndefined();
  });

  it("coach force 3:1 (4) pour un master (≥ 40 ans) : S3/12 reste 'load' → flaguée malgré l'âge", () => {
    const result = validatePlan(
      planWithWeek3NonCompliant(), "Marathon", undefined, undefined, undefined, undefined,
      { age: 45 } as any, undefined, undefined, undefined, undefined, undefined, undefined,
      4,
    );
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeDefined();
  });
});
