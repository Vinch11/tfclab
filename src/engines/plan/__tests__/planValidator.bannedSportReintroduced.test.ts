import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * GRAND SPRINT P0, Sprint 3 ("empêcher toute substitution automatique de
 * réintroduire une violation critique"), 2026-10-23 : le réconciliateur
 * SERVEUR (jsonPlanHandler.ts) ne consulte `bannedSports` nulle part dans
 * ses fonctions d'insertion/substitution/déduplication — seul le bloc
 * prompt en a connaissance. Si une correction post-génération réintroduit
 * même une seule séance d'une discipline explicitement bannie par le
 * coach, `validateSportRatio` (tolérance ±3%) peut rester muet si le
 * volume réintroduit est faible, et `validateObjectiveSportCoherence` ne
 * vérifie que l'ABSENCE d'une discipline obligatoire, jamais la PRÉSENCE
 * d'une discipline bannie. Cette suite verrouille
 * `validateBannedSportNotReintroduced`, le nouveau garde-fou dédié (rule
 * "banned_sport_reintroduced", non-dérogeable — voir criticalBlockingGate.test.ts).
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Séance vélo",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlanWithSport(sport: string, count: number, weeks = 1): ParsedPlan {
  const parsedWeeks: ParsedWeek[] = [];
  let remaining = count;
  for (let w = 1; w <= weeks; w++) {
    const sessions: ParsedSession[] = [];
    const thisWeek = Math.min(remaining, Math.ceil(count / weeks));
    for (let i = 0; i < thisWeek; i++) {
      sessions.push(makeSession({ weekNumber: w, sport, dayName: ["Lundi", "Mardi", "Mercredi"][i % 3], dayIndex: i % 3 }));
      remaining--;
    }
    sessions.push(makeSession({ weekNumber: w, sport: "Course", dayName: "Jeudi", dayIndex: 3, title: "EF" }));
    parsedWeeks.push({ weekNumber: w, theme: "Test", phase: "build", sessions });
  }
  return { title: "Plan Test", phases: [], weeks: parsedWeeks, totalWeeks: weeks } as ParsedPlan;
}

function bannedReintroducedIssues(plan: ParsedPlan, objective: string, constraintsText?: string) {
  const vr = validatePlan(
    plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, constraintsText,
  );
  return vr.issues.filter((i) => i.rule === "banned_sport_reintroduced");
}

describe("validateBannedSportNotReintroduced — discipline bannie réintroduite par une correction automatique", () => {
  it("[TEST OBLIGATOIRE] une seule séance de natation réintroduite malgré un bannissement explicite → erreur bloquante", () => {
    const plan = makePlanWithSport("Natation", 1, 8); // 1 séance sur 8 semaines : bien sous la tolérance ±3% de sport_ratio
    const issues = bannedReintroducedIssues(plan, "703", "pas de natation (épaule)");
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("Natation");
    expect(issues[0].message).toContain("1 séance");
  });

  it("aucune séance de la discipline bannie → aucune alerte", () => {
    const plan = makePlanWithSport("Vélo", 5, 8); // vélo présent, natation absente
    expect(bannedReintroducedIssues(plan, "703", "pas de natation").length).toBe(0);
  });

  it("aucune contrainte de bannissement → contrôle inactif même si la discipline est présente", () => {
    const plan = makePlanWithSport("Natation", 3, 4);
    expect(bannedReintroducedIssues(plan, "703", undefined).length).toBe(0);
  });

  it("[Sprint 2] une restriction PARTIELLE ambiguë (pas un vrai ban total) ne déclenche jamais ce contrôle", () => {
    const plan = makePlanWithSport("Natation", 2, 8);
    expect(bannedReintroducedIssues(plan, "703", "natation interdite en eau froide").length).toBe(0);
  });

  it("plusieurs disciplines bannies simultanément, une seule réintroduite → une seule erreur, nommée correctement", () => {
    const plan = makePlanWithSport("Natation", 2, 8);
    const issues = bannedReintroducedIssues(plan, "703", "pas de natation, pas de renforcement");
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("Natation");
  });

  it("non-dérogeable : rejoint NON_DEROGABLE_RULES et plafonne le score (CRITICAL_SCORE_CEILING)", () => {
    const plan = makePlanWithSport("Natation", 1, 8);
    const vr = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, "pas de natation",
    );
    expect(vr.score).toBeLessThanOrEqual(69);
  });
});
