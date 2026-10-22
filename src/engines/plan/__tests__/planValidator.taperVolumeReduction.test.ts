import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #A (demande coach
 * explicite) : validation DÉTERMINISTE du volume RÉELLEMENT prescrit (pas
 * le libellé "Affûtage") pendant les semaines d'affûtage — auto-référencée
 * sur le volume antérieur de CE plan (jamais un pourcentage universel),
 * discipline par discipline.
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
  return { title: "Plan TFCL™ — IM Test Athlete", phases: [], weeks, totalWeeks: weeks.length };
}

/** Répartit un volume discipline sur 1-2 séances pour rester sous les
 *  plafonds de `parseSessionDurationMin` (300min reconnu/token, 240min
 *  retourné/séance) — jamais un seul très gros nombre qui serait tronqué. */
function sportSessions(sport: string, totalMin: number): Partial<ParsedSession>[] {
  if (totalMin <= 0) return [];
  if (totalMin <= 200) return [{ sport, title: `${sport} A`, details: `${totalMin}min` }];
  const half = Math.ceil(totalMin / 2);
  return [
    { sport, title: `${sport} A`, details: `${half}min` },
    { sport, title: `${sport} B`, details: `${totalMin - half}min Séance clé 🔑` },
  ];
}

/** Semaine IM : natation + vélo + course, volumes paramétrables (min). */
function imWeek(weekNumber: number, natMin: number, veloMin: number, courseMin: number): ParsedWeek {
  return makeWeek(weekNumber, [
    ...sportSessions("Natation", natMin),
    ...sportSessions("Vélo", veloMin),
    ...sportSessions("Course", courseMin),
  ], "Build");
}
function raceWeek(weekNumber: number, natMin: number, veloMin: number, courseMin: number): ParsedWeek {
  return makeWeek(weekNumber, [
    ...sportSessions("Natation", natMin),
    ...sportSessions("Vélo", veloMin),
    { sport: "Course", title: "🏁 COURSE OBJECTIF", details: `Jour J — Ironman${courseMin > 0 ? ` ${courseMin}min` : ""}` },
  ], "Jour J", "taper");
}

/**
 * Plan IM de 10 semaines (taper=3 : S7-S8-S9, course S10) — choisi pour que
 * S5/S6 (référence "volume antérieur") soient deux VRAIES semaines de
 * charge consécutives (scheduledWeekType "load"), S4 étant automatiquement
 * "recovery" par position (cadence 4) et donc jamais incluse comme
 * référence par la règle (elle s'arrête à la 1ère semaine non-"load").
 */
function build10WeekPlan(taperWeeks: { nat: number; velo: number; course: number }[], raceVals: { nat: number; velo: number; course: number }): ParsedPlan {
  const weeks = [
    imWeek(1, 55, 220, 85),
    imWeek(2, 58, 230, 88),
    imWeek(3, 60, 235, 90),
    imWeek(4, 40, 150, 60), // recovery par position — jamais utilisée comme référence
    imWeek(5, 62, 240, 92), // référence "volume antérieur" (la plus légère des 2)
    imWeek(6, 65, 250, 95), // référence "volume antérieur"
    imWeek(7, taperWeeks[0].nat, taperWeeks[0].velo, taperWeeks[0].course),
    imWeek(8, taperWeeks[1].nat, taperWeeks[1].velo, taperWeeks[1].course),
    imWeek(9, taperWeeks[2].nat, taperWeeks[2].velo, taperWeeks[2].course),
    raceWeek(10, raceVals.nat, raceVals.velo, raceVals.course),
  ];
  return makePlan(weeks);
}

describe("validateTaperVolumeReduction — affûtage Ironman, volume réellement prescrit (pas le libellé)", () => {
  it("un affûtage réel (baisse nette, chaque discipline, jusqu'à la course) ne lève aucune alerte", () => {
    const plan = build10WeekPlan(
      [{ nat: 40, velo: 150, course: 60 }, { nat: 30, velo: 100, course: 40 }, { nat: 20, velo: 60, course: 30 }],
      { nat: 10, velo: 20, course: 10 },
    );
    const result = validatePlan(plan, "IM");
    const taperIssues = result.issues.filter(i => i.rule === "progression" && /affûtage/i.test(i.message));
    expect(taperIssues).toHaveLength(0);
  });

  it("une discipline qui ne baisse pas pendant l'affûtage (vélo resté au niveau d'avant) est signalée nommément", () => {
    const plan = build10WeekPlan(
      [{ nat: 40, velo: 150, course: 60 }, { nat: 30, velo: 100, course: 40 }, { nat: 20, velo: 260, course: 30 }], // S9 vélo > référence
      { nat: 10, velo: 20, course: 10 },
    );
    const result = validatePlan(plan, "IM");
    const veloIssue = result.issues.find(i => i.rule === "progression" && i.week === 9 && /Vélo pendant l'affûtage non réduit/i.test(i.message));
    expect(veloIssue).toBeDefined();
    expect(veloIssue?.severity).toBe("warning");
  });

  it("la dernière semaine d'affûtage (course) qui porte encore plus de volume que la semaine de charge la plus légère récente est signalée", () => {
    // Chaque discipline individuellement reste sous son propre seuil (pas de
    // signal par discipline), mais le TOTAL de la semaine de course
    // (65+250+85=400) dépasse la semaine de charge la plus légère récente
    // (S5=62+240+92=394) — affûtage non visible dans le contenu réel.
    const plan = build10WeekPlan(
      [{ nat: 40, velo: 150, course: 60 }, { nat: 30, velo: 100, course: 40 }, { nat: 20, velo: 60, course: 30 }],
      { nat: 65, velo: 250, course: 85 },
    );
    const result = validatePlan(plan, "IM");
    const lastWeekIssue = result.issues.find(i => i.rule === "progression" && i.week === 10 && /dernière semaine d'affûtage/i.test(i.message));
    expect(lastWeekIssue).toBeDefined();
  });

  it("pas assez de semaines de charge de référence avant l'affûtage → la règle s'abstient (jamais de signal sans donnée réelle)", () => {
    // Plan de 4 semaines : S1-S3 taper (IM=3), S4 course — aucune semaine
    // "load" avant le début de l'affûtage (S1 est la toute première semaine).
    const weeks = [
      imWeek(1, 40, 150, 60),
      imWeek(2, 30, 100, 40),
      imWeek(3, 20, 60, 30),
      raceWeek(4, 10, 20, 10),
    ];
    const result = validatePlan(makePlan(weeks), "IM");
    const taperIssues = result.issues.filter(i => i.rule === "progression" && (/affûtage/i.test(i.message) || /dernière semaine/i.test(i.message)));
    expect(taperIssues).toHaveLength(0);
  });
});
