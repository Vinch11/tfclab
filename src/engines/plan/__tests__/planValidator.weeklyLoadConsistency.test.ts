import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #C (demande coach
 * explicite) : validation déterministe de la COHÉRENCE de la charge
 * hebdomadaire réellement prescrite — auto-référencée sur l'historique de CE
 * plan, avec repli sur la charge habituelle/disponibilité maximale déclarées
 * par le coach quand l'historique en-plan est insuffisant.
 *
 * Plan de référence (16 semaines, IM) : décharges par position aux semaines
 * 4/8/12 (cadence 3:1 par défaut), affûtage S13-S15, course S16 — le reste
 * ("load") porte un volume par défaut stable de 250min/semaine
 * (nat40/vélo150/course60) sauf override explicite par semaine.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "base", dayName: "Dimanche", dayIndex: 6,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber, theme, phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber, weekTheme: theme,
      dayIndex: i % 7, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}
function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — IM Test Athlete (charge hebdo)", phases: [], weeks, totalWeeks: weeks.length };
}
function sportSessions(sport: string, totalMin: number): Partial<ParsedSession>[] {
  if (totalMin <= 0) return [];
  if (totalMin <= 200) return [{ sport, title: `${sport} A`, details: `${totalMin}min` }];
  const half = Math.ceil(totalMin / 2);
  return [{ sport, title: `${sport} A`, details: `${half}min` }, { sport, title: `${sport} B`, details: `${totalMin - half}min` }];
}
function imWeek(weekNumber: number, natMin: number, veloMin: number, courseMin: number): ParsedWeek {
  return makeWeek(weekNumber, [
    ...sportSessions("Natation", natMin),
    ...sportSessions("Vélo", veloMin),
    ...sportSessions("Course", courseMin),
  ], "Build");
}

const DEFAULT_WEEK = { nat: 40, velo: 150, course: 60 }; // 250min/semaine — baseline stable

function buildPlan16(overrides: Record<number, { nat: number; velo: number; course: number }> = {}): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let n = 1; n <= 16; n++) {
    const v = overrides[n] ?? DEFAULT_WEEK;
    weeks.push(imWeek(n, v.nat, v.velo, v.course));
  }
  return makePlan(weeks);
}

describe("validateWeeklyLoadConsistency — cohérence de la charge hebdomadaire (Correction C)", () => {
  it("un pic de périodisation légitime (ratio >1.3 mais sous la disponibilité max déclarée) est signalé en 'warning', jamais en 'error'", () => {
    const plan = buildPlan16({ 3: { nat: 55, velo: 220, course: 70 } }); // S3 total 345min, S1-S2 réf=250min, ratio 1.38
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { maxAvailableWeeklyHours: 8 });
    const issue = result.issues.find(i => i.rule === "progression" && i.week === 3 && /hausse brute de charge totale/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
  });

  it("une hausse qui dépasse EN PLUS la disponibilité maximale déclarée par le coach est 'error' (bloquant)", () => {
    const plan = buildPlan16({ 3: { nat: 80, velo: 300, course: 100 } }); // S3 total 480min (8h), réf=250min
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { maxAvailableWeeklyHours: 6 }); // 6h = 360min < 480min
    const issue = result.issues.find(i => i.rule === "progression" && i.week === 3 && /hausse brute de charge totale/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(issue?.detail).toMatch(/disponibilité maximale déclarée/i);
  });

  it("une semaine de décharge/affûtage n'est jamais signalée par cette règle, même avec un volume aberrant (hors périmètre)", () => {
    const plan = buildPlan16({ 4: { nat: 100, velo: 400, course: 150 } }); // S4 = décharge par position (cadence 4), volume énorme
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { habitualWeeklyHours: 3 });
    const issue = result.issues.find(i => i.rule === "progression" && i.week === 4 && /hausse brute/i.test(i.message));
    expect(issue).toBeUndefined();
  });

  it("une charge globale stable peut masquer une hausse excessive d'une seule discipline — signalée nommément", () => {
    const plan = buildPlan16({ 7: { nat: 40, velo: 140, course: 90 } }); // S7 total 270min (ratio 1.08 vs S5/S6=250, OK) mais Course seule 90 vs réf 60 (ratio 1.5)
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { habitualWeeklyHours: 4 });
    const totalIssue = result.issues.find(i => i.rule === "progression" && i.week === 7 && /hausse brute de charge totale/i.test(i.message));
    const sportIssue = result.issues.find(i => i.rule === "progression" && i.week === 7 && /hausse brute Course/i.test(i.message));
    expect(totalIssue).toBeUndefined();
    expect(sportIssue).toBeDefined();
    expect(sportIssue?.message).toMatch(/charge totale.*reste stable/i);
  });

  it("repli sur la charge habituelle déclarée quand CE plan n'a pas encore assez de semaines de référence (début de plan)", () => {
    const plan = buildPlan16({}); // S1 (0 semaine antérieure sur CE plan) reste au défaut 250min
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { habitualWeeklyHours: 3 }); // 3h=180min, ratio 250/180=1.39
    const issue = result.issues.find(i => i.rule === "progression" && i.week === 1 && /hausse brute de charge totale/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.detail).toMatch(/déclarée par le coach/i);
  });

  it("loadContext omis : comportement inchangé, aucune alerte de cette règle même avec un pic réel", () => {
    const plan = buildPlan16({ 3: { nat: 80, velo: 300, course: 100 } });
    const result = validatePlan(plan, "IM"); // loadContext omis
    const issues = result.issues.filter(i => i.rule === "progression" && /hausse brute/i.test(i.message));
    expect(issues).toHaveLength(0);
  });
});
